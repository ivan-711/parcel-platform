"""Chunk contextualizer — adds contextual summaries to chunks using Claude Haiku."""

import logging
import os

from anthropic import Anthropic

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a document analysis assistant. For each chunk of text provided, "
    "write a brief 1-2 sentence contextual summary that situates the chunk "
    "within the full document. This context helps with search retrieval. "
    "Be concise and factual."
)


def contextualize_chunks(doc_summary: str, chunks: list[str]) -> list[str]:
    """Add contextual prefixes to document chunks using Claude Haiku.

    Args:
        doc_summary: AI-generated summary of the full document.
        chunks: List of raw chunk text strings.

    Returns:
        List of contextualized strings: "{context_prefix}\\n\\n{original_chunk}"
    """
    if not chunks:
        return []

    # Skip contextualization for single-chunk documents
    if len(chunks) == 1:
        return chunks

    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    contextualized: list[str] = []

    # Batch chunks in groups of 10 to reduce API calls
    batch_size = 10
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        result = _contextualize_batch(client, doc_summary, batch, start_index=i)
        contextualized.extend(result)

    return contextualized


def _contextualize_batch(
    client: Anthropic,
    doc_summary: str,
    batch: list[str],
    start_index: int,
) -> list[str]:
    """Contextualize a batch of chunks in a single API call."""
    # Build the prompt with numbered chunks
    chunk_lines = []
    for j, chunk in enumerate(batch):
        idx = start_index + j + 1
        # Truncate each chunk to 2000 chars in the prompt to keep costs down
        preview = chunk[:2000] + "..." if len(chunk) > 2000 else chunk
        chunk_lines.append(f"[Chunk {idx}]\n{preview}\n")

    user_message = (
        f"Document summary: {doc_summary}\n\n"
        "For each chunk below, provide a 1-2 sentence contextual summary "
        "that explains what this section covers in the context of the full document. "
        "Format your response as:\n"
        "Chunk 1: <summary>\n"
        "Chunk 2: <summary>\n"
        "...and so on.\n\n"
        + "\n".join(chunk_lines)
    )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20241022",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        summaries = _parse_batch_response(response.content[0].text, len(batch))
    except Exception:
        logger.warning(
            "Contextualization failed for chunks %d-%d, using originals",
            start_index,
            start_index + len(batch),
            exc_info=True,
        )
        return batch

    # Prepend context to each chunk
    results = []
    for summary, original in zip(summaries, batch):
        if summary:
            results.append(f"{summary}\n\n{original}")
        else:
            results.append(original)

    return results


def _parse_batch_response(text: str, expected_count: int) -> list[str]:
    """Parse the numbered summary response from Claude."""
    lines = text.strip().split("\n")
    summaries: list[str] = []

    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Match "Chunk N: summary" or just numbered lines
        for prefix in [f"Chunk {len(summaries) + 1}:", f"{len(summaries) + 1}.", f"{len(summaries) + 1}:"]:
            if line.startswith(prefix):
                summaries.append(line[len(prefix):].strip())
                break
        else:
            # If we haven't matched enough yet and this is a non-empty line, take it
            if len(summaries) < expected_count:
                summaries.append(line)

    # Pad with empty strings if parsing fell short
    while len(summaries) < expected_count:
        summaries.append("")

    return summaries[:expected_count]
