from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.schemas.ingestion import IngestionRequest, IngestionResult
from app.services.llm_services import analyze_message
from app.utils.token_counter import estimate_tokens


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Enterprise Firewall API",
    description=(
        "An AI-powered message classification API "
        "using Groq LLM and structured Pydantic outputs."
    ),
    version="1.0.0",
)


# --------------------------------------------------
# CORS configuration
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Ingestion Firewall API is running",
    }


# --------------------------------------------------
# Analyze message
# --------------------------------------------------

@app.post("/api/analyze", response_model=IngestionResult)
def analyze(request: IngestionRequest):

    # Validate the incoming message
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty.",
        )

    try:
        # Call the LLM service
        result = analyze_message(message)

        # Estimate input tokens locally
        result.token_metadata.estimated_input_tokens = (
            estimate_tokens(message)
        )

        return result

    except ValidationError as exc:
        # Pydantic response validation error
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Structured response validation failed",
                "details": exc.errors(),
            },
        ) from exc

    except Exception as exc:
        # Print the complete error in the backend terminal
        import traceback

        traceback.print_exc()

        # Return the actual error temporarily for debugging
        raise HTTPException(
            status_code=502,
            detail=(
                f"LLM request failed: "
                f"{type(exc).__name__}: {exc}"
            ),
        ) from exc