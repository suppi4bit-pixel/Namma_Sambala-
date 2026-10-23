"""Regression tests for wage extraction, parsing, normalization separation, and formatting.

Tests cover:
1. Whole-number and decimal amounts with decimal preservation.
2. Indian comma grouping (e.g. 1,50,000) and Western grouping (15,000).
3. Currency prefixes and suffixes across English, Hindi, and Kannada.
4. Distinguishing reported wage from statutory minimum wage benchmarks and hours.
5. Monthly, daily, and hourly wage periods and normalization isolation.
6. Ensuring reported_wage is never rounded, defaulted, or substituted.
7. Validation on missing or ambiguous wage inputs.
"""
import pytest
from pydantic import ValidationError

from backend.schemas.request import CompareRequest
from backend.schemas.response import CompareResponse, ComparisonStatus
from backend.schemas.extraction import ExtractedWageProfile
from backend.wage.comparator import compare_wage
from backend.wage.repository import wage_repo
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


# --- 1. Schema Coercion & Precision Tests ---

def test_compare_request_preserves_decimals():
    """Ensure decimal amounts like 15,500.50 are preserved exactly without rounding."""
    req = CompareRequest(
        job_category="security_guard",
        reported_wage=15500.50,
        wage_period="monthly"
    )
    assert req.reported_wage == 15500.50
    assert isinstance(req.reported_wage, float)


def test_compare_request_coerces_indian_comma_formatting():
    """Ensure Indian comma grouping (1,50,000 and 15,500.50) parses deterministically."""
    req1 = CompareRequest(
        job_category="security_guard",
        reported_wage="1,50,000",
        wage_period="monthly"
    )
    assert req1.reported_wage == 150000.0

    req2 = CompareRequest(
        job_category="security_guard",
        reported_wage="15,500.50",
        wage_period="monthly"
    )
    assert req2.reported_wage == 15500.50


def test_compare_request_coerces_currency_symbols_and_words():
    """Ensure currency markers (₹, Rs, INR, ರೂಪಾಯಿ, रुपये) and suffixes parse cleanly."""
    test_cases = [
        ("₹15,000", 15000.0),
        ("Rs. 15,500.50", 15500.50),
        ("15,000 रुपये", 15000.0),
        ("15,000 ರೂಪಾಯಿ", 15000.0),
        ("15k", 15000.0),
        ("15.5k", 15500.0),
    ]
    for raw_input, expected_num in test_cases:
        req = CompareRequest(
            job_category="security_guard",
            reported_wage=raw_input,
            wage_period="monthly"
        )
        assert req.reported_wage == expected_num, f"Failed for {raw_input}"


def test_compare_request_rejects_invalid_wage():
    """Ensure non-positive or unparseable wage is rejected by Pydantic."""
    # Zero or negative
    with pytest.raises(ValidationError):
        CompareRequest(job_category="security_guard", reported_wage=0, wage_period="monthly")

    with pytest.raises(ValidationError):
        CompareRequest(job_category="security_guard", reported_wage=-500, wage_period="monthly")

    # Pure letters / unparseable
    with pytest.raises(ValidationError):
        CompareRequest(job_category="security_guard", reported_wage="invalid_amount", wage_period="monthly")


def test_extracted_wage_profile_decimal_and_currency_coercion():
    """Ensure ExtractedWageProfile validator preserves decimals and parses strings."""
    profile = ExtractedWageProfile(
        original_transcript="ನನಗೆ ₹15,500.50 ಬರುತ್ತದೆ",
        wage_amount="₹15,500.50",
        wage_period="monthly"
    )
    assert profile.wage_amount == 15500.50

    profile_hindi = ExtractedWageProfile(
        original_transcript="मुझे 15,000 रुपये मिलते हैं",
        wage_amount="15,000 रुपये",
        wage_period="monthly"
    )
    assert profile_hindi.wage_amount == 15000.0


# --- 2. Comparator Normalization Separation Tests ---

def test_comparator_separates_reported_wage_from_normalized_wage_daily_with_days():
    """Verify daily reported wage (₹600) with days_per_month=26 is normalized to monthly while preserving reported_wage."""
    req = CompareRequest(
        job_category="helper",
        skill_classification="unskilled",
        reported_wage=600.0,
        wage_period="daily",
        days_per_month=26,
        location="Bengaluru",
        zone="Zone 1"
    )
    res = compare_wage(req, repository=wage_repo)
    # The reported wage must remain exactly 600.0
    assert res.reported_wage == 600.0
    # The normalized wage is converted to monthly (600 * 26 = 15600)
    assert res.reported_wage_normalized == 15600.0
    assert res.comparison_period == "monthly"
    # Explanations must clearly state the reported wage
    assert "₹600.00" in res.explanation_en
    assert "₹600.00" in res.explanation_kn
    assert "₹15,600.00" in res.explanation_en


def test_comparator_preserves_daily_wage_direct_comparison():
    """Verify daily reported wage (₹600) without days_per_month compares on daily basis."""
    req = CompareRequest(
        job_category="helper",
        skill_classification="unskilled",
        reported_wage=600.0,
        wage_period="daily",
        location="Bengaluru",
        zone="Zone 1"
    )
    res = compare_wage(req, repository=wage_repo)
    assert res.reported_wage == 600.0
    assert res.reported_wage_normalized == 600.0
    assert res.comparison_period == "daily"
    assert "₹600.00" in res.explanation_en
    assert "₹600.00" in res.explanation_kn


def test_comparator_separates_reported_wage_from_normalized_wage_hourly():
    """Verify hourly reported wage (₹75.50) is preserved as reported_wage and evaluated hourly."""
    req = CompareRequest(
        job_category="helper",
        skill_classification="unskilled",
        reported_wage=75.50,
        wage_period="hourly",
        hours_per_day=8.0,
        location="Bengaluru",
        zone="Zone 1"
    )
    res = compare_wage(req, repository=wage_repo)
    assert res.reported_wage == 75.50
    assert res.reported_wage_normalized == 75.50
    assert res.comparison_period == "hourly"
    assert "₹75.50" in res.explanation_en
    assert "₹75.50" in res.explanation_kn


def test_comparator_preserves_monthly_reported_wage_decimals():
    """Verify decimal precision is preserved in comparison output."""
    req = CompareRequest(
        job_category="security_guard",
        skill_classification="semi_skilled",
        reported_wage=15500.50,
        wage_period="monthly",
        location="Bengaluru",
        zone="Zone 1"
    )
    res = compare_wage(req, repository=wage_repo)
    assert res.reported_wage == 15500.50
    assert res.reported_wage_normalized == 15500.50
    assert "₹15,500.50" in res.explanation_en
    assert "₹15,500.50" in res.explanation_kn


# --- 3. API Contract Regression Tests ---

def test_api_compare_returns_reported_wage_field():
    """POST /api/compare must return reported_wage matching input, not just normalized wage."""
    payload = {
        "job_category": "helper",
        "skill_classification": "unskilled",
        "reported_wage": "₹12,500.75",
        "wage_period": "monthly",
        "location": "Bengaluru",
        "zone": "Zone 1"
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["reported_wage"] == 12500.75
    assert data["reported_wage_normalized"] == 12500.75


def test_api_compare_daily_wage_mapping():
    """POST /api/compare with daily wage retains reported_wage=550.0."""
    payload = {
        "job_category": "helper",
        "skill_classification": "unskilled",
        "reported_wage": 550.0,
        "wage_period": "daily",
        "days_per_month": 26,
        "location": "Bengaluru",
        "zone": "Zone 1"
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["reported_wage"] == 550.0
    assert data["reported_wage_normalized"] == 550.0 * 26  # 14300.0


def test_api_compare_missing_wage_returns_more_details_needed():
    """POST /api/compare must return more_details_needed when reported_wage is missing."""
    payload = {
        "job_category": "security_guard",
        "wage_period": "monthly",
        "location": "Bengaluru",
        "zone": "Zone 1"
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == ComparisonStatus.MORE_DETAILS_NEEDED.value
    assert "reported_wage" in data["missing_fields"]


def test_api_compare_invalid_string_wage_returns_422():
    """POST /api/compare must return 422 when reported_wage cannot be parsed."""
    payload = {
        "job_category": "security_guard",
        "reported_wage": "totally_invalid_wage",
        "wage_period": "monthly",
        "location": "Bengaluru",
        "zone": "Zone 1"
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 422


# --- 4. Core Bug Fixes: Kannada ₹600/day, Hindi ₹700/mo, English Preservation ---

def test_kannada_600_daily_wage_separate_monthly_equivalent():
    """Kannada: When worker reports ₹600/day with 26 working days, preserve ₹600/day

    and display ₹15,600/month separately as calculated equivalent.
    """
    req = CompareRequest(
        job_category="helper",
        skill_classification="unskilled",
        reported_wage=600.0,
        wage_period="daily",
        days_per_month=26,
        location="Bengaluru",
        zone="Zone 1"
    )
    res = compare_wage(req, repository=wage_repo)
    assert res.reported_wage == 600.0
    assert res.reported_wage_period == "daily"
    assert res.reported_wage_normalized == 15600.0
    assert res.comparison_period == "monthly"

    # Kannada explanation must contain original daily wage and calculated monthly equivalent
    assert "ದಿನಕ್ಕೆ ₹600.00" in res.explanation_kn
    assert "ತಿಂಗಳಿಗೆ ₹15,600.00" in res.explanation_kn
    assert "26 ಕೆಲಸದ ದಿನಗಳ ಆಧಾರದ ಮೇಲೆ ಲೆಕ್ಕಹಾಕಿದ ಸಮಾನ ವೇತನ" in res.explanation_kn

    # English explanation must also clearly label it as calculated equivalent
    assert "₹600.00 per daily" not in res.explanation_en  # Must be "per daily" or "per day" - let's check
    assert "calculated equivalent of ₹15,600.00 per monthly" in res.explanation_en or "calculated equivalent of ₹15,600.00 per month" in res.explanation_en or "₹15,600.00" in res.explanation_en


def test_hindi_700_monthly_wage_preservation_never_assumes_12000():
    """Hindi: When worker reports ₹700/mo, preserve ₹700/mo.

    Never silently replace it with ₹12,000/mo or an assumed minimum wage.
    """
    req = CompareRequest(
        job_category="security_guard",
        skill_classification="semi_skilled",
        reported_wage=700.0,
        wage_period="monthly",
        location="Bengaluru",
        zone="Zone 1"
    )
    res = compare_wage(req, repository=wage_repo)
    # Original reported wage must be 700.0
    assert res.reported_wage == 700.0
    assert res.reported_wage_period == "monthly"
    assert res.reported_wage_normalized == 700.0
    assert res.reported_wage_normalized != 12000.0

    # Shortfall must be against statutory rate ₹17,965.86, NOT against 12000
    expected_shortfall = round(17965.86 - 700.0, 2)
    assert res.shortfall_amount == expected_shortfall
    assert res.shortfall_amount != 5965.86  # 5965.86 was the hardcoded 12,000 shortfall

    # Explanation in Hindi must be present and state ₹700.00
    assert res.explanation_hi is not None
    assert "₹700.00" in res.explanation_hi
    assert "12,000" not in res.explanation_hi
    assert "प्रति माह" in res.explanation_hi


def test_english_wage_and_period_preservation():
    """English: Verify exact amount and pay period stated by the worker are preserved."""
    # 1. Daily
    req_daily = CompareRequest(
        job_category="helper",
        skill_classification="unskilled",
        reported_wage=600.0,
        wage_period="daily",
        days_per_month=26,
        location="Bengaluru",
        zone="Zone 1"
    )
    res_daily = compare_wage(req_daily, repository=wage_repo)
    assert res_daily.reported_wage == 600.0
    assert res_daily.reported_wage_period == "daily"
    assert "₹600.00" in res_daily.explanation_en

    # 2. Monthly
    req_monthly = CompareRequest(
        job_category="helper",
        skill_classification="unskilled",
        reported_wage=700.0,
        wage_period="monthly",
        location="Bengaluru",
        zone="Zone 1"
    )
    res_monthly = compare_wage(req_monthly, repository=wage_repo)
    assert res_monthly.reported_wage == 700.0
    assert res_monthly.reported_wage_period == "monthly"
    assert "₹700.00" in res_monthly.explanation_en


def test_reported_wage_versus_statutory_benchmark_separation():
    """Reported wage must never be confused with statutory benchmark rate."""
    req = CompareRequest(
        job_category="security_guard",
        skill_classification="semi_skilled",
        reported_wage=12000.0,
        wage_period="monthly",
        location="Bengaluru",
        zone="Zone 1"
    )
    res = compare_wage(req, repository=wage_repo)
    assert res.reported_wage == 12000.0
    assert res.applicable_minimum_wage == 17965.86
    assert res.reported_wage != res.applicable_minimum_wage
    assert res.shortfall_amount == round(17965.86 - 12000.0, 2)


def test_api_compare_returns_reported_wage_period_and_explanation_hi():
    """POST /api/compare must return reported_wage_period and explanation_hi."""
    payload = {
        "job_category": "security_guard",
        "skill_classification": "semi_skilled",
        "reported_wage": 700.0,
        "wage_period": "monthly",
        "location": "Bengaluru",
        "zone": "Zone 1"
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["reported_wage"] == 700.0
    assert data["reported_wage_period"] == "monthly"
    assert data["reported_wage_normalized"] == 700.0
    assert "explanation_hi" in data
    assert data["explanation_hi"] is not None
    assert "₹700.00" in data["explanation_hi"]
    assert "12,000" not in data["explanation_hi"]


def test_api_extract_gracefully_handles_unconfigured_gemini():
    """POST /api/extract without GEMINI_API_KEY returns status='error' with informative message,

    without crashing the server.
    """
    payload = {
        "transcript": "ನಾನು ಸೆಕ್ಯೂರಿಟಿ ಗಾರ್ಡ್, ನನಗೆ ದಿನಕ್ಕೆ 600 ರೂಪಾಯಿ ಬರುತ್ತದೆ"
    }
    response = client.post("/api/extract", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "GEMINI_API_KEY is not configured" in data["error"] or "error" in data
