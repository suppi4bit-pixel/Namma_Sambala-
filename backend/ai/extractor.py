
"""AI-powered wage extraction for Namma Sambala.

Supports worker transcripts in Kannada, Hindi, and English.
Uses Gemini structured output and preserves uncertainty instead of
inventing missing wage or employment details.
"""

import json
import logging
import os
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import ValidationError

from backend import config as app_config
from backend.schemas.extraction import ExtractedWageProfile
from backend.ai.prompts import EXTRACTION_SYSTEM_INSTRUCTION


logger = logging.getLogger("namma_sambala_ai")

# Preserve the configured key as a patchable module-level setting.
GEMINI_API_KEY = getattr(app_config, "GEMINI_API_KEY", "")


class GeminiServiceUnavailableError(RuntimeError):
    """Raised when Gemini is temporarily unavailable."""


def get_gemini_client(api_key: Optional[str] = None):
    """Create a Gemini client using an explicit or configured API key."""
    load_dotenv()

    if api_key is None:
        api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")

    if not api_key or not str(api_key).strip():
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Configure GEMINI_API_KEY in your local environment."
        )

    try:
        return genai.Client(api_key=api_key)
    except Exception as exc:
        logger.error("Unable to initialize the Gemini client.")
        raise RuntimeError(
            "Unable to initialize Gemini. Check the local configuration."
        ) from exc


def _is_service_unavailable(exc: Exception) -> bool:
    """Identify common Gemini HTTP 503/service-capacity errors."""
    code = getattr(exc, "code", None)
    status_code = getattr(exc, "status_code", None)
    message = str(exc).upper()

    if code == 503 or status_code == 503:
        return True

    return (
        "503" in message
        and (
            "UNAVAILABLE" in message
            or "HIGH DEMAND" in message
            or "SERVICE UNAVAILABLE" in message
        )
    )



def _parse_profile(response) -> ExtractedWageProfile:
    """Validate Gemini's structured response against the project schema."""
    parsed = getattr(response, "parsed", None)

    if isinstance(parsed, ExtractedWageProfile):
        return parsed

    try:
        if parsed is not None:
            return ExtractedWageProfile.model_validate(parsed)

        response_text = getattr(response, "text", None)

        if not response_text or not response_text.strip():
            raise ValueError(
                "Gemini returned an empty extraction response."
            )

        payload = json.loads(response_text)
        return ExtractedWageProfile.model_validate(payload)

    except ValueError:
        raise
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        logger.warning(
            "Gemini returned an invalid extraction response."
        )
        raise ValueError(
            "Could not validate the extracted wage details. "
            "Please try again."
        ) from exc

def _mark_uncertain_fields(
    profile: ExtractedWageProfile,
) -> ExtractedWageProfile:
    """Flag missing critical facts for worker confirmation."""
    missing_fields = list(profile.missing_or_uncertain_fields or [])

    required_values = {
        "location": profile.location,
        "sector": profile.sector,
        "job_role": profile.job_role,
        "wage_amount": profile.wage_amount,
        "wage_period": profile.wage_period,
    }

    for field_name, value in required_values.items():
        is_missing = value is None or (
            isinstance(value, str) and not value.strip()
        )

        if is_missing and field_name not in missing_fields:
            missing_fields.append(field_name)

    if (
        profile.wage_period == "hourly"
        and profile.working_hours_per_day is None
        and "working_hours_per_day" not in missing_fields
    ):
        missing_fields.append("working_hours_per_day")

    profile.missing_or_uncertain_fields = missing_fields

    if missing_fields:
        profile.confirmation_required = True

    return profile


def extract_wage_profile(
    transcript: str,
    client=None,
    model: Optional[str] = None,
) -> ExtractedWageProfile:
    """Extract reported wage and employment facts from a transcript.

    Args:
        transcript: Worker-reported information in Kannada, Hindi, or English.
        client: Optional Gemini client, useful for testing.
        model: Optional Gemini model override.

    Returns:
        A validated ExtractedWageProfile.

    Raises:
        ValueError: If the transcript or response is invalid.
        GeminiServiceUnavailableError: If Gemini is temporarily unavailable.
        RuntimeError: If an unexpected Gemini request error occurs.
    """
    if not isinstance(transcript, str) or not transcript.strip():
        raise ValueError("Transcript cannot be empty.")

    clean_transcript = transcript.strip()

    load_dotenv()

    active_client = client if client is not None else get_gemini_client()

    target_model = (
        model
        or getattr(app_config, "GEMINI_MODEL", None)
        or os.getenv("GEMINI_MODEL")
        or "gemini-2.5-flash"
    )

    generation_config = types.GenerateContentConfig(
        temperature=0.0,
        response_mime_type="application/json",
        response_schema=ExtractedWageProfile,
        system_instruction=EXTRACTION_SYSTEM_INSTRUCTION,
    )

    call_kwargs = {
        "model": target_model,
        "contents": (
            "Extract only facts stated or clearly implied by the worker. "
            "The transcript may be in Kannada, Hindi, or English. "
            "Preserve uncertainty. Never invent wage amounts, hours, "
            "locations, job roles, or other missing details.\n\n"
            f'Worker transcript:\n"""{clean_transcript}"""'
        ),
        "config": generation_config,
    }

    try:
        response = active_client.models.generate_content(**call_kwargs)
    except Exception as exc:
        if _is_service_unavailable(exc):
            logger.warning("Gemini is temporarily unavailable.")
            raise GeminiServiceUnavailableError(
                "Gemini is temporarily unavailable. Please try again shortly."
            ) from exc

        logger.error("Gemini extraction request failed.")
        raise RuntimeError(
            "Unable to extract wage details using Gemini. "
            "Please check the service configuration and try again."
        ) from exc

    profile = _parse_profile(response)

    # Preserve the source transcript for auditing and worker confirmation.
    profile.original_transcript = clean_transcript

    return _mark_uncertain_fields(profile)
