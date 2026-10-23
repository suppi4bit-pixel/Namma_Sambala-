"""Gemini extraction service for Kannada and English wage transcripts."""
import logging
from typing import Any, Optional

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None  # type: ignore
    types = None  # type: ignore

from backend.config import GEMINI_API_KEY, GEMINI_MODEL
from backend.schemas.extraction import ExtractedWageProfile
from backend.ai.prompts import EXTRACTION_SYSTEM_INSTRUCTION

logger = logging.getLogger("namma_sambala_ai")


def get_gemini_client(api_key: Optional[str] = None) -> Any:
    """Initialize official google-genai Client."""
    if genai is None:
        raise RuntimeError(
            "The 'google-genai' package is not installed. "
            "Please run: pip install -r requirements.txt"
        )
    key = api_key or GEMINI_API_KEY
    if not key or not key.strip():
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Please configure your Gemini API key in the local .env file."
        )
    return genai.Client(api_key=key.strip())


def extract_wage_profile(
    transcript: str,
    client: Optional[Any] = None,
    model_name: Optional[str] = None,
) -> ExtractedWageProfile:
    """Extract structured wage facts from Kannada or English transcript using Gemini.

    Adheres strictly to zero-hallucination and deterministic safety:
    - Never infers unstated wage amounts or shift hours.
    - Preserves verbatim input transcript.
    - Sets confirmation_required=True when critical comparison fields are uncertain.
    """
    clean_transcript = transcript.strip()
    if not clean_transcript:
        raise ValueError("Transcript cannot be empty.")

    # Avoid logging sensitive worker transcripts
    logger.info("Processing wage extraction for transcript (length: %d chars)", len(clean_transcript))

    active_client = client or get_gemini_client()
    target_model = model_name or GEMINI_MODEL

    config = None
    if types is not None:
        config = types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
            response_schema=ExtractedWageProfile,
            system_instruction=EXTRACTION_SYSTEM_INSTRUCTION,
        )

    call_kwargs = {
        "model": target_model,
        "contents": f"Worker Transcript:\n\"\"\"{clean_transcript}\"\"\"",
    }
    if config is not None:
        call_kwargs["config"] = config

    response = active_client.models.generate_content(**call_kwargs)

    # 1. Parse structured response
    profile: Optional[ExtractedWageProfile] = None
    if hasattr(response, "parsed") and isinstance(response.parsed, ExtractedWageProfile):
        profile = response.parsed
    elif hasattr(response, "text") and response.text:
        profile = ExtractedWageProfile.model_validate_json(response.text)
    elif isinstance(response, ExtractedWageProfile):
        profile = response
    elif isinstance(response, dict):
        profile = ExtractedWageProfile.model_validate(response)
    else:
        raise ValueError("Failed to extract structured data from Gemini response.")

    # 2. Guarantee transcript preservation
    profile.original_transcript = clean_transcript

    # 3. Deterministic safety guardrails in Python
    # Check for missing critical fields that the legal comparator requires
    missing_items = list(profile.missing_or_uncertain_fields)

    if profile.wage_amount is None and "wage_amount" not in missing_items:
        missing_items.append("wage_amount")

    if not profile.wage_period and "wage_period" not in missing_items:
        missing_items.append("wage_period")

    if not profile.job_role and "job_role" not in missing_items:
        missing_items.append("job_role")

    if profile.wage_period == "hourly" and profile.working_hours_per_day is None:
        if "working_hours_per_day" not in missing_items:
            missing_items.append("working_hours_per_day")

    profile.missing_or_uncertain_fields = missing_items

    # If any critical comparison field is missing or ambiguous, confirmation is strictly required
    critical_keys = {"wage_amount", "wage_period", "job_role", "working_hours_per_day", "skill_category"}
    if any(k in missing_items for k in critical_keys):
        profile.confirmation_required = True

    return profile
