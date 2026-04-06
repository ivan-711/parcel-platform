"""Dramatiq actors for document processing — metadata extraction + RAG embedding pipeline."""

import logging
import time
import uuid

logger = logging.getLogger(__name__)

try:
    import dramatiq
except ImportError:
    dramatiq = None


def _noop_send(*args, **kwargs):
    """Raise when Dramatiq is not available and a task is dispatched."""
    from core.tasks import WorkerUnavailableError
    raise WorkerUnavailableError("Background worker is not available. Document processing requires Redis.")


if dramatiq:

    @dramatiq.actor(max_retries=3, min_backoff=10000)
    def process_document_metadata(document_id: str) -> None:
        """Stage 1: Extract text, call Claude for metadata analysis.

        On success, dispatches process_document_embeddings for RAG indexing.
        """
        logger.info("Starting metadata extraction for document %s", document_id)

        from core.documents.processor import run_metadata_extraction
        run_metadata_extraction(document_id)

        # Check if metadata extraction succeeded before dispatching embeddings
        from database import SessionLocal
        from models.documents import Document

        db = SessionLocal()
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc and doc.status == "complete":
                logger.info("Metadata complete, dispatching embedding pipeline for %s", document_id)
                process_document_embeddings.send(document_id)
            else:
                logger.warning("Metadata extraction did not complete for %s, skipping embeddings", document_id)
        finally:
            db.close()

    @dramatiq.actor(max_retries=3, min_backoff=10000)
    def process_document_embeddings(document_id: str) -> None:
        """Stage 2: Chunk, contextualize, embed, and store in pgvector."""
        start_time = time.time()
        logger.info("Starting embedding pipeline for document %s", document_id)

        from database import SessionLocal
        from models.documents import Document
        from models.document_chunks import DocumentChunk
        from core.storage.s3_service import download_file
        from core.documents.extractor import extract_text_from_pdf, extract_text_from_docx
        from core.documents.chunker import chunk_text
        from core.documents.contextualizer import contextualize_chunks
        from core.ai.embeddings import embed_texts

        db = SessionLocal()
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if not doc:
                logger.error("Document %s not found", document_id)
                return

            doc.embedding_status = "processing"
            doc.embedding_meta = {"total_chunks": None, "processed_chunks": 0}
            db.commit()

            # 1. Download file from S3
            file_bytes = download_file(doc.s3_key)

            # 2. Extract text
            if doc.file_type == "pdf":
                extraction = extract_text_from_pdf(file_bytes)
            elif doc.file_type == "docx":
                extraction = extract_text_from_docx(file_bytes)
            else:
                # Images — skip RAG for now (no text to chunk)
                doc.embedding_status = "complete"
                doc.embedding_meta = {"total_chunks": 0, "processed_chunks": 0}
                db.commit()
                logger.info("Skipping embeddings for image document %s", document_id)
                return

            text = extraction.text

            # Store truncation metadata on the document
            if extraction.was_truncated:
                doc.embedding_meta = {
                    "truncated": True,
                    "total_chars": extraction.total_chars,
                    "extracted_chars": extraction.extracted_chars,
                }
                db.commit()
                logger.info(
                    "Document %s truncated: %d/%d chars",
                    document_id, extraction.extracted_chars,
                    extraction.total_chars,
                )

            if not text or not text.strip():
                doc.embedding_status = "failed"
                doc.embedding_meta = {"error": "No text extracted"}
                db.commit()
                return

            # 3. Clean slate — delete any existing chunks from a previous attempt
            existing_chunks = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.document_id == doc.id)
                .count()
            )
            if existing_chunks > 0:
                logger.info(
                    "Clearing %d existing chunks for document %s (retry)",
                    existing_chunks, document_id,
                )
                db.query(DocumentChunk).filter(
                    DocumentChunk.document_id == doc.id
                ).delete()
                db.commit()

            # 4. Chunk the text
            chunks = chunk_text(text)
            total_chunks = len(chunks)
            doc.embedding_meta = {"total_chunks": total_chunks, "processed_chunks": 0}
            db.commit()

            if not chunks:
                doc.embedding_status = "complete"
                db.commit()
                return

            # 4. Contextualize chunks via Claude Haiku
            doc_summary = doc.ai_summary or "Real estate document"
            chunk_texts = [c["content"] for c in chunks]
            contextualized = contextualize_chunks(doc_summary, chunk_texts)

            # 5. Embed and store in batches — each batch is committed independently
            #    so partial progress survives mid-batch OpenAI failures.
            embed_batch_size = 10
            processed_chunks = 0

            for i in range(0, len(chunks), embed_batch_size):
                batch_end = min(i + embed_batch_size, len(chunks))
                batch_texts = contextualized[i:batch_end]

                try:
                    batch_embeddings = embed_texts(batch_texts)
                except Exception as embed_err:
                    logger.error(
                        "Embedding batch %d-%d failed for %s: %s",
                        i, batch_end, document_id, embed_err,
                    )
                    # Mark as partial — already-committed chunks are preserved
                    doc.embedding_status = "partial"
                    doc.embedding_meta = {
                        "total_chunks": total_chunks,
                        "processed_chunks": processed_chunks,
                        "error": f"Embedding failed at chunk {i}: {str(embed_err)[:200]}",
                    }
                    db.commit()
                    raise

                for j in range(i, batch_end):
                    chunk_data = chunks[j]
                    db_chunk = DocumentChunk(
                        id=uuid.uuid4(),
                        document_id=doc.id,
                        chunk_index=chunk_data["chunk_index"],
                        content=chunk_data["content"],
                        contextualized_content=contextualized[j] if j < len(contextualized) else None,
                        embedding=batch_embeddings[j - i] if (j - i) < len(batch_embeddings) else None,
                        token_count=len(chunk_data["content"]) // 4,
                        metadata=chunk_data.get("metadata"),
                    )
                    db.add(db_chunk)

                processed_chunks = batch_end
                doc.embedding_meta = {
                    "total_chunks": total_chunks,
                    "processed_chunks": processed_chunks,
                }
                db.commit()

            # 6. Mark complete
            doc.embedding_status = "complete"
            doc.embedding_meta = {
                "total_chunks": total_chunks,
                "processed_chunks": total_chunks,
            }
            db.commit()

            elapsed = time.time() - start_time
            logger.info(
                "Embedding pipeline complete for %s: %d chunks in %.1fs",
                document_id, total_chunks, elapsed,
            )

            try:
                from core.telemetry import track_event
                track_event(doc.user_id, "document_embedding_completed", {
                    "document_id": document_id,
                    "chunks_count": total_chunks,
                    "duration_ms": int(elapsed * 1000),
                })
            except Exception:
                pass

        except Exception as e:
            logger.error("Embedding pipeline failed for %s: %s", document_id, e, exc_info=True)
            try:
                doc = db.query(Document).filter(Document.id == document_id).first()
                if doc:
                    doc.embedding_status = "failed"
                    doc.embedding_meta = {"error": str(e)[:500]}
                    db.commit()

                    from core.telemetry import track_event
                    track_event(doc.user_id, "document_embedding_failed", {
                        "document_id": document_id,
                        "error": str(e)[:200],
                    })
            except Exception:
                pass
        finally:
            db.close()

else:
    class _NoopActor:
        def __call__(self, *args, **kwargs):
            _noop_send(*args, **kwargs)

        def send(self, *args, **kwargs):
            _noop_send(*args, **kwargs)

    process_document_metadata = _NoopActor()
    process_document_embeddings = _NoopActor()
