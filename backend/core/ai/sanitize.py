"""Sanitize user-controlled text before including in AI prompts.

Prevents prompt injection by stripping control characters and XML-like tags.
"""

import re


def sanitize_for_prompt(text: str, max_length: int = 500) -> str:
    """Sanitize user-controlled text for safe inclusion in AI prompts.

    - Strips XML/HTML tags
    - Escapes angle brackets
    - Removes control characters
    - Truncates to max_length
    """
    if not text:
        return ""

    # Strip XML/HTML tags
    cleaned = re.sub(r"<[^>]+>", "", text)

    # Escape remaining angle brackets
    cleaned = cleaned.replace("<", "&lt;").replace(">", "&gt;")

    # Remove control characters (keep newlines, tabs)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)

    # Truncate
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length] + "..."

    return cleaned.strip()
