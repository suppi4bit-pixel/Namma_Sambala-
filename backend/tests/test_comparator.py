"""Unit tests for deterministic comparator and wage normalizer."""
import pytest
from backend.schemas.request import CompareRequest
from backend.schemas.response import ComparisonStatus
from backend.wage.comparator import compare_wage
from backend.wage.normalizer import normalize_and_align_wage
from backend.wage.repository import WageRepository


def test_normalization_monthly():
    """Verify standard monthly normalization with 26-day basis."""
    res = normalize_and_align_wage(
        reported_wage=15000.0,
        reported_period="monthly",
        statutory_monthly=17965.86,
        statutory_daily=690.99,
    )
    assert res.success is True
    assert res.comparison_period == "monthly"
    assert res.reported_wage_normalized == 15000.0
    assert res.applicable_statutory_wage == 17965.86
    assert res.working_days_factor_used == 26


def test_normalization_daily_without_days():
    """Verify daily normalization compares directly on daily basis."""
    res = normalize_and_align_wage(
        reported_wage=500.0,
        reported_period="daily",
        statutory_monthly=17965.86,
        statutory_daily=690.99,
    )
    assert res.success is True
    assert res.comparison_period == "daily"
    assert res.reported_wage_normalized == 500.0
    assert res.applicable_statutory_wage == 690.99


def test_normalization_daily_with_custom_days():
    """Verify daily normalization with reported working days converts to monthly."""
    res = normalize_and_align_wage(
        reported_wage=600.0,
        reported_period="daily",
        statutory_monthly=17965.86,
        statutory_daily=690.99,
        days_per_month=25,
    )
    assert res.success is True
    assert res.comparison_period == "monthly"
    assert res.reported_wage_normalized == 15000.0  # 600 * 25
    assert res.applicable_statutory_wage == 17965.86


def test_normalization_hourly_without_hours():
    """Verify hourly wage normalization fails safely if daily hours are missing."""
    res = normalize_and_align_wage(
        reported_wage=80.0,
        reported_period="hourly",
        statutory_monthly=17965.86,
        statutory_daily=690.99,
        hours_per_day=None,
    )
    assert res.success is False
    assert res.missing_requirement == "hours_per_day"


def test_normalization_hourly_with_hours():
    """Verify hourly wage normalization succeeds when daily hours are confirmed."""
    res = normalize_and_align_wage(
        reported_wage=80.0,
        reported_period="hourly",
        statutory_monthly=17965.86,
        statutory_daily=690.99,
        hours_per_day=8.0,
    )
    assert res.success is True
    assert res.comparison_period == "hourly"
    assert res.reported_wage_normalized == 80.0
    # Statutory hourly = 690.99 / 8 = 86.37
    assert res.applicable_statutory_wage == pytest.approx(86.37, abs=0.05)


def test_draft_records_excluded_from_comparison():
    """Verify that records marked as draft/unverified are NEVER matched."""
    repo = WageRepository()
    # "unverified_test_job" is in verified_wages_v1.json with status="draft"
    req = CompareRequest(
        job_category="unverified_test_job",
        reported_wage=15000.0,
        wage_period="monthly",
    )
    res = compare_wage(req, repository=repo)
    assert res.status == ComparisonStatus.RATE_NOT_VERIFIED
    assert res.verified_record is None
