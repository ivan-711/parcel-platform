"""RAG retrieval service — hybrid search with vector similarity + keyword matching + RRF."""

import logging
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.ai.embeddings import embed_query

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    chunk_id: UUID
    document_id: UUID
    content: str
    contextualized_content: str | None
    relevance_score: float
    source_filename: str
    chunk_index: int
    metadata: dict | None


def retrieve_relevant_chunks(
    query: str,
    user_id: UUID,
    db: Session,
    document_ids: list[UUID] | None = None,
    property_id: UUID | None = None,
    top_k: int = 5,
) -> list[RetrievedChunk]:
    """Retrieve the most relevant document chunks using hybrid search.

    Combines pgvector cosine similarity with pg_trgm keyword matching
    using Reciprocal Rank Fusion (RRF) to produce a unified ranking.
    """
    # Generate query embedding
    query_embedding = embed_query(query)

    # Run both searches
    vector_results = _vector_search(
        query_embedding, user_id, db,
        document_ids=document_ids, property_id=property_id, top_k=20,
    )
    keyword_results = _keyword_search(
        query, user_id, db,
        document_ids=document_ids, property_id=property_id, top_k=20,
    )

    # Fuse rankings
    fused = _reciprocal_rank_fusion(vector_results, keyword_results, k=60)

    return fused[:top_k]


def _vector_search(
    query_embedding: list[float],
    user_id: UUID,
    db: Session,
    document_ids: list[UUID] | None = None,
    property_id: UUID | None = None,
    top_k: int = 20,
) -> list[RetrievedChunk]:
    """Cosine similarity search via pgvector."""
    params: dict = {"user_id": str(user_id), "top_k": top_k}

    # Build optional filter clauses from a static whitelist
    extra_filters = ""
    if document_ids:
        extra_filters += " AND dc.document_id = ANY(:document_ids)"
        params["document_ids"] = [str(did) for did in document_ids]
    if property_id:
        extra_filters += " AND d.property_id = :property_id"
        params["property_id"] = str(property_id)

    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"
    params["query_embedding"] = embedding_str

    sql = text(
        "SELECT"
        "    dc.id as chunk_id,"
        "    dc.document_id,"
        "    dc.content,"
        "    dc.contextualized_content,"
        "    dc.chunk_index,"
        "    dc.metadata,"
        "    d.original_filename,"
        "    1 - (dc.embedding <=> :query_embedding::vector) as similarity"
        " FROM document_chunks dc"
        " JOIN documents d ON d.id = dc.document_id"
        " WHERE d.user_id = :user_id"
        "    AND dc.embedding IS NOT NULL"
        + extra_filters
        + " ORDER BY dc.embedding <=> :query_embedding::vector"
        " LIMIT :top_k"
    )

    rows = db.execute(sql, params).fetchall()

    return [
        RetrievedChunk(
            chunk_id=row.chunk_id,
            document_id=row.document_id,
            content=row.content,
            contextualized_content=row.contextualized_content,
            relevance_score=float(row.similarity),
            source_filename=row.original_filename,
            chunk_index=row.chunk_index,
            metadata=row.metadata,
        )
        for row in rows
    ]


def _keyword_search(
    query: str,
    user_id: UUID,
    db: Session,
    document_ids: list[UUID] | None = None,
    property_id: UUID | None = None,
    top_k: int = 20,
) -> list[RetrievedChunk]:
    """Full-text search using tsvector on chunk content."""
    params: dict = {"user_id": str(user_id), "query": query, "top_k": top_k}

    # Build optional filter clauses from a static whitelist
    extra_filters = ""
    if document_ids:
        extra_filters += " AND dc.document_id = ANY(:document_ids)"
        params["document_ids"] = [str(did) for did in document_ids]
    if property_id:
        extra_filters += " AND d.property_id = :property_id"
        params["property_id"] = str(property_id)

    sql = text(
        "SELECT"
        "    dc.id as chunk_id,"
        "    dc.document_id,"
        "    dc.content,"
        "    dc.contextualized_content,"
        "    dc.chunk_index,"
        "    dc.metadata,"
        "    d.original_filename,"
        "    ts_rank("
        "        to_tsvector('english', dc.content),"
        "        plainto_tsquery('english', :query)"
        "    ) as rank"
        " FROM document_chunks dc"
        " JOIN documents d ON d.id = dc.document_id"
        " WHERE d.user_id = :user_id"
        "    AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', :query)"
        + extra_filters
        + " ORDER BY rank DESC"
        " LIMIT :top_k"
    )

    rows = db.execute(sql, params).fetchall()

    return [
        RetrievedChunk(
            chunk_id=row.chunk_id,
            document_id=row.document_id,
            content=row.content,
            contextualized_content=row.contextualized_content,
            relevance_score=float(row.rank),
            source_filename=row.original_filename,
            chunk_index=row.chunk_index,
            metadata=row.metadata,
        )
        for row in rows
    ]


def _reciprocal_rank_fusion(
    vector_results: list[RetrievedChunk],
    keyword_results: list[RetrievedChunk],
    k: int = 60,
) -> list[RetrievedChunk]:
    """Combine vector and keyword rankings using Reciprocal Rank Fusion.

    RRF score for each chunk = sum(1 / (k + rank)) across both result lists.
    Higher score = more relevant.
    """
    scores: dict[UUID, float] = {}
    chunk_map: dict[UUID, RetrievedChunk] = {}

    for rank, chunk in enumerate(vector_results):
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0) + 1 / (k + rank + 1)
        chunk_map[chunk.chunk_id] = chunk

    for rank, chunk in enumerate(keyword_results):
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0) + 1 / (k + rank + 1)
        if chunk.chunk_id not in chunk_map:
            chunk_map[chunk.chunk_id] = chunk

    # Sort by fused score descending
    sorted_ids = sorted(scores.keys(), key=lambda cid: scores[cid], reverse=True)

    results = []
    for cid in sorted_ids:
        chunk = chunk_map[cid]
        # Replace the original relevance_score with the RRF fused score
        results.append(RetrievedChunk(
            chunk_id=chunk.chunk_id,
            document_id=chunk.document_id,
            content=chunk.content,
            contextualized_content=chunk.contextualized_content,
            relevance_score=scores[cid],
            source_filename=chunk.source_filename,
            chunk_index=chunk.chunk_index,
            metadata=chunk.metadata,
        ))

    return results
