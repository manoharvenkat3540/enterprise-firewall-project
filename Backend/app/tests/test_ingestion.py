import unittest
import sys
from pathlib import Path

from pydantic import ValidationError

# Ensure the Backend directory is on the import path when tests are launched
# from the repository root or by an editor.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.schemas.ingestion import IngestionRequest, IngestionResult


def test_request_trims_message():
    request = IngestionRequest(message="  Hi there  ")
    assert request.message == "Hi there"


def test_request_rejects_blank_message():
    with unittest.TestCase().assertRaises(ValidationError):
        IngestionRequest(message="   ")


def test_result_rejects_invalid_intent():
    with unittest.TestCase().assertRaises(ValidationError):
        IngestionResult(
            intent="shopping",
            risk_profile="low",
            priority="low",
            requires_action=False,
            summary="A test",
        )


def test_result_accepts_valid_data():
    result = IngestionResult(
        intent="greeting",
        risk_profile="low",
        priority="low",
        requires_action=False,
        summary="The user greeted the assistant.",
    )
    assert result.intent == "greeting"
    assert result.token_metadata.estimated_input_tokens == 0
