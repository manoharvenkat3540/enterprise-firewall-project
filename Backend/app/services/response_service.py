from groq import Groq

from app.utils.config import GROQ_API_KEY, GROQ_MODEL
from app.schemas.ingestion import IngestionResult
from app.services.prompt_templates import build_response_prompt


def generate_response(
    message: str,
    analysis: IngestionResult,
) -> str:
    """
    Generate a context-aware Markdown response using Groq.
    """

    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is missing. Add it to Backend/.env."
        )

    client = Groq(api_key=GROQ_API_KEY)

    prompt = build_response_prompt(
        message=message,
        analysis=analysis,
    )

    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful customer-support assistant. "
                    "Provide accurate, concise answers in Markdown. "
                    "Never invent account information or claim actions "
                    "were completed when they were not."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.3,
        max_tokens=500,
    )

    response = completion.choices[0].message.content

    if not response or not response.strip():
        raise RuntimeError(
            "The LLM returned an empty response."
        )

    return response.strip()