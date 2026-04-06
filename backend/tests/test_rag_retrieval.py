"""Tests for the RAG retrieval service — RRF fusion logic."""

import uuid
from core.ai.rag_retrieval import RetrievedChunk, _reciprocal_rank_fusion


def _make_chunk(chunk_id=None, score=0.5, content="test") -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id or uuid.uuid4(),
        document_id=uuid.uuid4(),
        content=content,
        contextualized_content=None,
        relevance_score=score,
        source_filename="test.pdf",
        chunk_index=0,
        metadata=None,
    )


def test_rrf_empty_inputs():
    result = _reciprocal_rank_fusion([], [])
    assert result == []


def test_rrf_single_list():
    c1 = _make_chunk(score=0.9)
    c2 = _make_chunk(score=0.5)
    result = _reciprocal_rank_fusion([c1, c2], [])
    assert len(result) == 2
    # c1 should rank higher (rank 1 in vector results)
    assert result[0].chunk_id == c1.chunk_id


def test_rrf_boosts_chunks_in_both_lists():
    shared_id = uuid.uuid4()
    c_vector_only = _make_chunk(score=0.9)
    c_shared_vector = _make_chunk(chunk_id=shared_id, score=0.8)
    c_shared_keyword = _make_chunk(chunk_id=shared_id, score=0.7)
    c_keyword_only = _make_chunk(score=0.6)

    result = _reciprocal_rank_fusion(
        [c_vector_only, c_shared_vector],
        [c_shared_keyword, c_keyword_only],
    )

    # The shared chunk should be ranked first because it appears in both lists
    assert result[0].chunk_id == shared_id


def test_rrf_no_duplicates():
    shared_id = uuid.uuid4()
    c1 = _make_chunk(chunk_id=shared_id)
    c2 = _make_chunk(chunk_id=shared_id)

    result = _reciprocal_rank_fusion([c1], [c2])
    # Should not have duplicate entries
    ids = [r.chunk_id for r in result]
    assert len(ids) == len(set(ids))


def test_rrf_preserves_all_unique_chunks():
    ids = [uuid.uuid4() for _ in range(4)]
    vector = [_make_chunk(chunk_id=ids[0]), _make_chunk(chunk_id=ids[1])]
    keyword = [_make_chunk(chunk_id=ids[2]), _make_chunk(chunk_id=ids[3])]

    result = _reciprocal_rank_fusion(vector, keyword)
    result_ids = {r.chunk_id for r in result}
    assert result_ids == set(ids)
