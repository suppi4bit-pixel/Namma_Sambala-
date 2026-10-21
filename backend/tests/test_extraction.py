"""Unit and integration tests for Gemini wage extraction module."""
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas.extraction import (
    ExtractionRequest,
    ExtractedWageProfile,
    ExtractionResponse,
)
from backend.schemas.response import ComparisonStatus
from backend.wage.comparator import compare_wage
from backend.ai.extractor import extract_wage_profile, get_gemini_client

client = TestClient(app)


def make_mock_gemini_client(parsed_profile: ExtractedWageProfile) -> MagicMock:
    """Create a mocked genai.Client returning a pre-configured ExtractedWageProfile."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.parsed = parsed_profile
    mock_response.text = parsed_profile.model_dump_json()
    mock_client.models.generate_content.return_value = mock_response
    return mock_client


def test_kannada_input_extraction():
    """Verify extraction from a Kannada spoken transcript."""
    kannada_transcript = "ನಾನು ಕೋರಮಂಗಲದಲ್ಲಿ ಸೆಕ್ಯೂರಿಟಿ ಗಾರ್ಡ್ ಆಗಿ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ, ತಿಂಗಳಿಗೆ 12000 ರೂಪಾಯಿ ಸಂಬಳ, ದಿನಕ್ಕೆ 8 ಗಂಟೆ ಕೆಲಸ."
    mock_profile = ExtractedWageProfile(
        original_transcript=kannada_transcript,
        location="Koramangala, Bengaluru",
        sector="Security Agencies",
        job_role="security_guard",
        skill_category="semi_skilled",
        wage_amount=12000.0,
        wage_period="monthly",
        working_hours_per_day=8.0,
        days_worked_per_week=6,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,
        confidence_notes="Clear Kannada monthly wage transcript.",
    )
    mock_client = make_mock_gemini_client(mock_profile)

    res = extract_wage_profile(kannada_transcript, client=mock_client)

    assert res.original_transcript == kannada_transcript
    assert res.job_role == "security_guard"
    assert res.wage_amount == 12000.0
    assert res.wage_period == "monthly"
    assert res.working_hours_per_day == 8.0
    assert res.confirmation_required is False
    assert len(res.missing_or_uncertain_fields) == 0

    # Verify seamless mapping to teammate CompareRequest
    compare_req = res.to_compare_request()
    assert compare_req is not None
    assert compare_req.job_category == "security_guard"
    assert compare_req.reported_wage == 12000.0
    assert compare_req.wage_period == "monthly"


def test_english_input_extraction():
    """Verify extraction from an English spoken transcript."""
    english_transcript = "I work as a helper in a commercial shop in Bengaluru. My daily wage is 450 rupees for 8 hours a day."
    mock_profile = ExtractedWageProfile(
        original_transcript=english_transcript,
        location="Bengaluru",
        sector="Shops & Commercial Establishments",
        job_role="helper",
        skill_category=None,
        wage_amount=450.0,
        wage_period="daily",
        working_hours_per_day=8.0,
        days_worked_per_week=6,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,
    )
    mock_client = make_mock_gemini_client(mock_profile)

    res = extract_wage_profile(english_transcript, client=mock_client)

    assert res.original_transcript == english_transcript
    assert res.job_role == "helper"
    assert res.wage_amount == 450.0
    assert res.wage_period == "daily"
    assert res.working_hours_per_day == 8.0
    assert res.confirmation_required is False

    compare_req = res.to_compare_request()
    assert compare_req is not None
    assert compare_req.job_category == "helper"
    assert compare_req.reported_wage == 450.0
    assert compare_req.wage_period == "daily"


def test_missing_hours_for_hourly_wage_requires_confirmation():
    """Verify hourly wage without hours_per_day flags missing field and requires confirmation."""
    transcript = "ನಾನು ಮನೆಗೆಲಸ ಮಾಡುತ್ತೇನೆ, ಗಂಟೆಗೆ 60 ರೂಪಾಯಿ ಕೊಡ್ತಾರೆ."
    mock_profile = ExtractedWageProfile(
        original_transcript=transcript,
        location=None,
        sector="Domestic Workers",
        job_role="domestic_worker",
        skill_category="unskilled",
        wage_amount=60.0,
        wage_period="hourly",
        working_hours_per_day=None,
        days_worked_per_week=None,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,  # Even if LLM returns False, Python guardrail must enforce True
    )
    mock_client = make_mock_gemini_client(mock_profile)

    res = extract_wage_profile(transcript, client=mock_client)

    assert res.wage_period == "hourly"
    assert res.working_hours_per_day is None
    # Python safety guardrail must enforce these:
    assert "working_hours_per_day" in res.missing_or_uncertain_fields
    assert res.confirmation_required is True


def test_missing_wage_amount_requires_confirmation():
    """Verify missing wage amount leaves wage_amount null and requires confirmation."""
    transcript = "I work as a security guard at an apartment in Whitefield."
    mock_profile = ExtractedWageProfile(
        original_transcript=transcript,
        location="Whitefield, Bengaluru",
        sector="Security Agencies",
        job_role="security_guard",
        skill_category=None,
        wage_amount=None,
        wage_period="monthly",
        working_hours_per_day=8.0,
        days_worked_per_week=6,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,
    )
    mock_client = make_mock_gemini_client(mock_profile)

    res = extract_wage_profile(transcript, client=mock_client)

    assert res.wage_amount is None
    assert "wage_amount" in res.missing_or_uncertain_fields
    assert res.confirmation_required is True
    # Cannot compare wage without wage amount
    assert res.to_compare_request() is None


def test_ambiguous_role_requires_confirmation():
    """Verify ambiguous role without wage details requires worker confirmation."""
    transcript = "ನಾನು ಬೆಂಗಳೂರಿನಲ್ಲಿ ಯಾವುದೋ ಕೆಲಸ ಮಾಡ್ತೀನಿ, ಸ್ವಲ್ಪ ದುಡ್ಡು ಕೊಡ್ತಾರೆ."
    mock_profile = ExtractedWageProfile(
        original_transcript=transcript,
        location="Bengaluru",
        sector=None,
        job_role=None,
        skill_category=None,
        wage_amount=None,
        wage_period=None,
        working_hours_per_day=None,
        days_worked_per_week=None,
        overtime_details=None,
        missing_or_uncertain_fields=["job_role", "wage_amount"],
        confirmation_required=True,
    )
    mock_client = make_mock_gemini_client(mock_profile)

    res = extract_wage_profile(transcript, client=mock_client)

    assert res.job_role is None
    assert res.wage_amount is None
    assert res.confirmation_required is True
    assert "job_role" in res.missing_or_uncertain_fields
    assert "wage_amount" in res.missing_or_uncertain_fields
    assert res.to_compare_request() is None


def test_empty_transcript_raises_value_error():
    """Verify empty or whitespace-only transcript is rejected immediately."""
    with pytest.raises(ValueError, match="Transcript cannot be empty"):
        extract_wage_profile("   ")


def test_unconfigured_api_key_raises_error():
    """Verify missing GEMINI_API_KEY raises a descriptive ValueError."""
    with pytest.raises(ValueError, match="GEMINI_API_KEY is not configured"):
        get_gemini_client(api_key="")


def test_post_api_extract_endpoint_success():
    """Verify POST /api/extract returns 200 OK with extracted profile."""
    transcript = "I work as a mason in Bengaluru earning 800 rupees daily."
    mock_profile = ExtractedWageProfile(
        original_transcript=transcript,
        location="Bengaluru",
        sector="Building & Construction",
        job_role="mason",
        skill_category="skilled",
        wage_amount=800.0,
        wage_period="daily",
        working_hours_per_day=8.0,
        days_worked_per_week=6,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,
    )

    with patch("backend.main.extract_wage_profile", return_value=mock_profile):
        response = client.post("/api/extract", json={"transcript": transcript})
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "ok"
        assert payload["data"]["job_role"] == "mason"
        assert payload["data"]["wage_amount"] == 800.0
        assert payload["data"]["wage_period"] == "daily"
        assert payload["data"]["confirmation_required"] is False


def test_post_api_extract_endpoint_validation_error():
    """Verify POST /api/extract handles empty transcript gracefully."""
    response = client.post("/api/extract", json={"transcript": "   "})
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "error"
    assert "Transcript cannot be empty" in payload["error"]


def test_end_to_end_extract_to_comparator_integration():
    """Verify extracted Kannada profile converts to CompareRequest and calculates statutory shortfall correctly."""
    kannada_transcript = "ನಾನು ಕೋರಮಂಗಲದಲ್ಲಿ ಸೆಕ್ಯೂರಿಟಿ ಗಾರ್ಡ್, ತಿಂಗಳಿಗೆ 12000 ರೂಪಾಯಿ ಸಂಬಳ."
    mock_profile = ExtractedWageProfile(
        original_transcript=kannada_transcript,
        location="Koramangala",
        sector="Security Agencies",
        job_role="security_guard",
        skill_category=None,
        wage_amount=12000.0,
        wage_period="monthly",
        working_hours_per_day=8.0,
        days_worked_per_week=6,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,
    )
    mock_client = make_mock_gemini_client(mock_profile)

    extracted = extract_wage_profile(kannada_transcript, client=mock_client)
    compare_req = extracted.to_compare_request()
    assert compare_req is not None

    # Deterministic legal verification via teammate comparator
    compare_res = compare_wage(compare_req)
    assert compare_res.status == ComparisonStatus.SHORTFALL_INDICATED
    assert compare_res.shortfall_indicated is True
    assert compare_res.applicable_minimum_wage == 17965.86
    assert compare_res.shortfall_amount == 5965.86
    assert compare_res.shortfall_percentage == 33.21
    assert "₹5,965.86" in compare_res.explanation_en
    assert "ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ" in compare_res.explanation_kn


def test_missing_wage_period_prevents_comparison_conversion():
    """Verify missing wage_period requires confirmation and blocks conversion to comparison request."""
    transcript = "ನಾನು ಸಹಾಯಕರಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತೇನೆ, 500 ರೂಪಾಯಿ ಕೊಡ್ತಾರೆ."
    mock_profile = ExtractedWageProfile(
        original_transcript=transcript,
        location="Bengaluru",
        sector="Shops & Commercial Establishments",
        job_role="helper",
        skill_category=None,
        wage_amount=500.0,
        wage_period=None,  # Missing: could be daily, weekly, or monthly
        working_hours_per_day=8.0,
        days_worked_per_week=None,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,
    )
    mock_client = make_mock_gemini_client(mock_profile)

    res = extract_wage_profile(transcript, client=mock_client)
    assert res.wage_period is None
    assert "wage_period" in res.missing_or_uncertain_fields
    assert res.confirmation_required is True
    # Crucial safety rule: Never default to monthly or attempt comparison
    assert res.to_compare_request() is None


def test_hourly_wage_missing_hours_blocks_comparison_conversion():
    """Verify hourly wage without hours_per_day blocks conversion to comparison request."""
    profile = ExtractedWageProfile(
        original_transcript="Domestic work at 60 per hour",
        location="Bengaluru",
        sector="Domestic Workers",
        job_role="domestic_worker",
        skill_category="unskilled",
        wage_amount=60.0,
        wage_period="hourly",
        working_hours_per_day=None,
        missing_or_uncertain_fields=["working_hours_per_day"],
        confirmation_required=True,
    )
    # Cannot convert to comparison request without confirmed shift duration
    assert profile.to_compare_request() is None


def test_unsupported_skill_classification_flagged_uncertain():
    """Verify unsupported skill category is flagged as uncertain, not silently treated as valid."""
    raw_data = {
        "original_transcript": "I am an expert electrician earning 20000 monthly",
        "location": "Bengaluru",
        "job_role": "electrician",
        "wage_amount": 20000.0,
        "wage_period": "monthly",
        "skill_category": "expert",  # Non-statutory category
        "missing_or_uncertain_fields": [],
        "confirmation_required": False,
    }
    profile = ExtractedWageProfile.model_validate(raw_data)
    # Must be stripped to None and flagged as uncertain
    assert profile.skill_category is None
    assert "skill_category" in profile.missing_or_uncertain_fields
    assert profile.confirmation_required is True
    assert "Unsupported skill category 'expert'" in (profile.confidence_notes or "")

    # Can safely convert to compare_request with skill_classification=None (valid for comparator)
    compare_req = profile.to_compare_request()
    assert compare_req is not None
    assert compare_req.skill_classification is None


def test_locality_handling_zone1_and_outside_zone():
    """Verify Bengaluru area names resolve to Zone 1, while outside areas preserve unverified status."""
    # (a) Known Bengaluru locality
    profile_blr = ExtractedWageProfile(
        original_transcript="Security guard at Koramangala",
        location="Koramangala",
        job_role="security_guard",
        wage_amount=18000.0,
        wage_period="monthly",
    )
    req_blr = profile_blr.to_compare_request()
    assert req_blr is not None
    assert req_blr.location == "Koramangala, Bengaluru"
    res_blr = compare_wage(req_blr)
    assert res_blr.status == ComparisonStatus.NO_SHORTFALL_INDICATED

    # (b) Unverified outside zone (e.g. Mysuru Rural)
    profile_outside = ExtractedWageProfile(
        original_transcript="Security guard at Mysuru Rural",
        location="Mysuru Rural",
        job_role="security_guard",
        wage_amount=12000.0,
        wage_period="monthly",
    )
    req_outside = profile_outside.to_compare_request()
    assert req_outside is not None
    assert req_outside.location == "Mysuru Rural"
    res_outside = compare_wage(req_outside)
    # Preserves unverified status under Karnataka Zone 1 rules
    assert res_outside.status == ComparisonStatus.RATE_NOT_VERIFIED


def test_hindi_input_extraction():
    """Verify extraction from a Hindi spoken transcript using the shared schema."""
    hindi_transcript = "मैं बेंगलुरु में सुरक्षा गार्ड का काम करता हूँ। मुझे हर महीने 15000 रुपये मिलते हैं। मैं रोज़ 8 घंटे और हफ्ते में 6 दिन काम करता हूँ।"
    mock_profile = ExtractedWageProfile(
        original_transcript=hindi_transcript,
        location="Bengaluru",
        sector="Security Agencies",
        job_role="security_guard",
        skill_category=None,
        wage_amount=15000.0,
        wage_period="monthly",
        working_hours_per_day=8.0,
        days_worked_per_week=6,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,
        confidence_notes="Clear Hindi monthly wage transcript.",
    )
    mock_client = make_mock_gemini_client(mock_profile)

    res = extract_wage_profile(hindi_transcript, client=mock_client)

    assert res.original_transcript == hindi_transcript
    assert res.job_role == "security_guard"
    assert res.wage_amount == 15000.0
    assert res.wage_period == "monthly"
    assert res.working_hours_per_day == 8.0
    assert res.days_worked_per_week == 6
    assert res.confirmation_required is False
    assert res.missing_or_uncertain_fields == []

    # Hindi input must map to the same comparison request contract.
    compare_req = res.to_compare_request()
    assert compare_req is not None
    assert compare_req.job_category == "security_guard"
    assert compare_req.reported_wage == 15000.0
    assert compare_req.wage_period == "monthly"


def test_hindi_missing_wage_period_requires_confirmation():
    """Hindi transcript with an unstated payment period must not default to monthly."""
    transcript = "मैं बेंगलुरु में हेल्पर का काम करता हूँ। मुझे 500 रुपये मिलते हैं।"
    mock_profile = ExtractedWageProfile(
        original_transcript=transcript,
        location="Bengaluru",
        sector="Shops & Commercial Establishments",
        job_role="helper",
        skill_category=None,
        wage_amount=500.0,
        wage_period=None,
        working_hours_per_day=None,
        days_worked_per_week=None,
        overtime_details=None,
        missing_or_uncertain_fields=[],
        confirmation_required=False,
    )
    mock_client = make_mock_gemini_client(mock_profile)

    res = extract_wage_profile(transcript, client=mock_client)

    assert res.wage_amount == 500.0
    assert res.wage_period is None
    assert "wage_period" in res.missing_or_uncertain_fields
    assert res.confirmation_required is True
    assert res.to_compare_request() is None

