"""Text chunker — splits document text into overlapping chunks at sentence boundaries."""

import re


def chunk_text(
    text: str,
    chunk_size: int = 3200,
    overlap: int = 800,
) -> list[dict]:
    """Split text into overlapping chunks, respecting sentence boundaries.

    Args:
        text: Full document text.
        chunk_size: Target chunk size in characters (~800 tokens at ~4 chars/token).
        overlap: Overlap between consecutive chunks in characters.

    Returns:
        List of dicts with keys: content, chunk_index, metadata.
    """
    if not text or not text.strip():
        return []

    text = text.strip()

    # If short enough for a single chunk, return as-is
    if len(text) <= chunk_size:
        return [{"content": text, "chunk_index": 0, "metadata": {"approx_page": 1}}]

    # Split into paragraphs first
    paragraphs = re.split(r"\n\n+", text)

    chunks: list[dict] = []
    current_chunk: list[str] = []
    current_len = 0
    char_offset = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        para_len = len(para)

        # If adding this paragraph would exceed chunk_size, finalize current chunk
        if current_len + para_len > chunk_size and current_chunk:
            chunk_text_str = "\n\n".join(current_chunk)
            chunks.append({
                "content": chunk_text_str,
                "chunk_index": len(chunks),
                "metadata": {"approx_page": _estimate_page(char_offset, len(text))},
            })

            # Overlap: keep paragraphs from the end of the current chunk
            overlap_chunks: list[str] = []
            overlap_len = 0
            for prev_para in reversed(current_chunk):
                if overlap_len + len(prev_para) > overlap:
                    break
                overlap_chunks.insert(0, prev_para)
                overlap_len += len(prev_para)

            char_offset += current_len - overlap_len
            current_chunk = overlap_chunks
            current_len = overlap_len

        # If a single paragraph exceeds chunk_size, split by sentences
        if para_len > chunk_size:
            sentences = _split_sentences(para)
            for sentence in sentences:
                sent_len = len(sentence)
                if current_len + sent_len > chunk_size and current_chunk:
                    chunk_text_str = " ".join(current_chunk)
                    chunks.append({
                        "content": chunk_text_str,
                        "chunk_index": len(chunks),
                        "metadata": {"approx_page": _estimate_page(char_offset, len(text))},
                    })
                    # Overlap from sentences
                    overlap_sents: list[str] = []
                    ol = 0
                    for s in reversed(current_chunk):
                        if ol + len(s) > overlap:
                            break
                        overlap_sents.insert(0, s)
                        ol += len(s)
                    char_offset += current_len - ol
                    current_chunk = overlap_sents
                    current_len = ol

                # If a single sentence exceeds chunk_size, hard-split on word boundaries
                if sent_len > chunk_size and not current_chunk:
                    remaining = sentence
                    while len(remaining) > chunk_size:
                        split_at = remaining[:chunk_size].rfind(' ')
                        if split_at <= 0:
                            split_at = chunk_size
                        chunks.append({
                            "content": remaining[:split_at].strip(),
                            "chunk_index": len(chunks),
                            "metadata": {"approx_page": _estimate_page(char_offset, len(text))},
                        })
                        char_offset += split_at
                        remaining = remaining[split_at:].strip()
                    if remaining:
                        current_chunk.append(remaining)
                        current_len = len(remaining)
                else:
                    current_chunk.append(sentence)
                    current_len += sent_len
        else:
            current_chunk.append(para)
            current_len += para_len

    # Final chunk
    if current_chunk:
        chunk_text_str = "\n\n".join(current_chunk)
        chunks.append({
            "content": chunk_text_str,
            "chunk_index": len(chunks),
            "metadata": {"approx_page": _estimate_page(char_offset, len(text))},
        })

    return chunks


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences, keeping the delimiter with the sentence.

    Avoids splitting on periods inside:
    - Dollar amounts ($125,000.00)
    - Common abbreviations (Mr., Mrs., Dr., St., Ave., LLC., Inc., No., etc.)
    - URLs (http://... or https://...)
    """
    # Regex: split on .!? followed by whitespace, but only when the period
    # is NOT preceded by common abbreviations or decimal-number patterns.
    # Negative lookbehind for abbreviations and numbers.
    _ABBREV = r"(?<!\bMr)(?<!\bMs)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bAve)(?<!\bBlvd)(?<!\bNo)(?<!\bInc)(?<!\bLLC)(?<!\bCo)(?<!\bCorp)(?<!\bLtd)(?<!\bJr)(?<!\bSr)(?<!\bEsq)(?<!\bvs)(?<!\bU\.S)(?<!\be\.g)(?<!\bi\.e)(?<!\betc)(?<!\bapprox)"
    _NOT_DECIMAL = r"(?<!\d)"
    pattern = _NOT_DECIMAL + _ABBREV + r"(?<=[.!?])\s+(?=[A-Z\"\'\(]|\d)"
    parts = re.split(pattern, text)
    return [s.strip() for s in parts if s.strip()]


def _estimate_page(char_offset: int, total_chars: int, chars_per_page: int = 3000) -> int:
    """Estimate the page number based on character offset."""
    if total_chars == 0:
        return 1
    return max(1, (char_offset // chars_per_page) + 1)
