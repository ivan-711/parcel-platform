"""Tests for the document text chunker."""

from core.documents.chunker import chunk_text


def test_empty_text_returns_empty():
    assert chunk_text("") == []
    assert chunk_text("   ") == []
    assert chunk_text(None) == []


def test_short_text_single_chunk():
    text = "This is a short document."
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0]["content"] == text
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["metadata"]["approx_page"] == 1


def test_long_text_produces_multiple_chunks():
    # Create text with many paragraphs
    paragraphs = [f"This is paragraph number {i}. It contains some text." for i in range(100)]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text, chunk_size=500, overlap=100)
    assert len(chunks) > 1
    # All chunks should have sequential indices
    for i, chunk in enumerate(chunks):
        assert chunk["chunk_index"] == i


def test_chunk_indices_are_sequential():
    text = "\n\n".join([f"Paragraph {i} with enough content to make chunking happen." * 5 for i in range(20)])
    chunks = chunk_text(text, chunk_size=500, overlap=100)
    indices = [c["chunk_index"] for c in chunks]
    assert indices == list(range(len(chunks)))


def test_chunks_preserve_content():
    """All original text should appear in at least one chunk."""
    paragraphs = ["First paragraph with important content.", "Second paragraph with more details.", "Third paragraph concluding thoughts."]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text, chunk_size=10000)
    # With a large chunk_size, everything fits in one chunk
    assert len(chunks) == 1
    for para in paragraphs:
        assert para in chunks[0]["content"]


def test_metadata_has_approx_page():
    text = "A" * 10000  # ~3+ pages
    chunks = chunk_text(text, chunk_size=2000, overlap=200)
    assert len(chunks) > 1
    # All chunks should have approx_page metadata
    for chunk in chunks:
        assert "approx_page" in chunk["metadata"]
        assert chunk["metadata"]["approx_page"] >= 1


def test_overlap_between_chunks():
    """Consecutive chunks should share some content (overlap)."""
    paragraphs = [f"Sentence {i} in the document." for i in range(50)]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text, chunk_size=300, overlap=100)
    if len(chunks) >= 2:
        # Check that the end of chunk 0 overlaps with the start of chunk 1
        # (at least some text should be shared)
        c0_words = set(chunks[0]["content"].split())
        c1_words = set(chunks[1]["content"].split())
        shared = c0_words & c1_words
        assert len(shared) > 0, "Expected overlap between consecutive chunks"
