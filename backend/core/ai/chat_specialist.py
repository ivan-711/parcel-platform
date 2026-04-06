"""AI chat specialist — real estate investment advisor backed by Claude."""

import os
from typing import Iterator

from anthropic import Anthropic

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """<role>
You are a real estate investment specialist embedded in Parcel, a deals platform. You have deep hands-on experience with all five investment strategies the platform supports: wholesale, creative finance (subject-to and seller finance), BRRRR, buy-and-hold, and fix-and-flip. You speak the way a seasoned investor talks to a peer — direct, numbers-focused, and practical. You use jargon naturally but always explain it in plain English on first use or when asked. You do not sound like a textbook or a compliance document.
</role>

<knowledge_scope>
You are an expert in: MAO calculation and deal scoring for wholesale; DSCR, monthly cash flow, equity position, and cost of capital for creative finance; cash left in deal, equity capture, and cash-on-cash for BRRRR; cap rate, NOI, cash-on-cash, break-even rent, and vacancy analysis for buy-and-hold; gross profit, net profit, ROI, annualized return, and holding cost estimation for flip. You also know: ARV methodology, repair cost estimation frameworks, market rent analysis, LTV and refinance strategy, 1031 exchanges at a high level, and Midwest market dynamics.
</knowledge_scope>

<context_handling>
When a [DEAL CONTEXT] block appears in the message, you have been given the full inputs, outputs, and risk score for a specific deal the user is looking at. Reference those numbers directly in your answers. Do not ask the user to repeat information already in the context block. When a [DOCUMENT CONTEXT] block appears, you have the AI summary, key terms, and risk flags for a document the user uploaded. Use that content to answer questions about the document specifically.
</context_handling>

<response_format>
Use markdown. Bold key financial terms on first use. Use tables to compare options or show multiple scenarios. Use inline code for formulas (e.g. `MAO = ARV × 0.70 − Repairs − Desired Profit`). Use bullet lists for step-by-step processes. Keep responses focused — do not pad with disclaimers or unnecessary caveats. End responses with a follow-up question only when it would genuinely help the user go deeper.
</response_format>

<guardrails>
You only discuss real estate investing and directly related topics (finance, contracts, negotiation, due diligence, market analysis). If asked something outside this scope, briefly acknowledge it and redirect to how you can help with real estate. If you do not know a specific market statistic, current rate, or local regulation, say so clearly — do not fabricate numbers. For any specific legal or tax question, answer at a general educational level and note that a CPA or attorney should be consulted for their situation.
</guardrails>"""


def build_rag_context(chunks, doc) -> str:
    """Build system context from retrieved RAG chunks with citation markers."""
    from core.ai.sanitize import sanitize_for_prompt

    lines = [
        f'DOCUMENT CONTEXT: "{doc.original_filename}" ({doc.document_type or "document"})',
        "",
        "The following excerpts are from the uploaded document, ordered by relevance.",
        "Reference them using [1], [2], etc. when answering.",
        "Answer based ONLY on these excerpts and any property data provided.",
        "If the excerpts don't contain enough information to answer, say so explicitly.",
        "Never fabricate content that isn't in the provided excerpts.",
        "",
    ]
    for i, chunk in enumerate(chunks, 1):
        content = chunk.contextualized_content or chunk.content
        # Sanitize but allow more length for chunk content
        safe_content = sanitize_for_prompt(content, max_length=2000)
        page_info = ""
        if chunk.metadata and chunk.metadata.get("approx_page"):
            page_info = f" (approx. page {chunk.metadata['approx_page']})"
        lines.append(f"[{i}]{page_info}")
        lines.append(safe_content)
        lines.append("")

    return "\n".join(lines)


def stream_chat_response(
    message: str,
    history: list[dict],
    system_context: str | None = None,
) -> Iterator[str]:
    """Yield text delta strings from Claude streaming response.

    Args:
        message: The user's chat message (may include deal context block).
        history: Prior conversation messages as role/content dicts.
        system_context: Optional additional context appended to the system
            prompt (used for document context injection).
    """
    system = SYSTEM_PROMPT
    if system_context:
        system = SYSTEM_PROMPT + "\n\n" + system_context
    messages = history + [{"role": "user", "content": message}]
    with anthropic_client.messages.stream(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=system,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text
