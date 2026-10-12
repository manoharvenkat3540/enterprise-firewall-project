def estimate_tokens(text: str) -> int:
    """Estimate the number of tokens in a text string."""
    if not text:
        return 0

    # A rough estimate for English text; not an exact tokenizer.
    return max(1, len(text.split()) * 4 // 3)
