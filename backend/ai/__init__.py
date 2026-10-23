"""AI Extraction module for Namma Sambala."""
from backend.ai.extractor import extract_wage_profile, get_gemini_client
from backend.ai.prompts import EXTRACTION_SYSTEM_INSTRUCTION

__all__ = [
    "extract_wage_profile",
    "get_gemini_client",
    "EXTRACTION_SYSTEM_INSTRUCTION",
]
