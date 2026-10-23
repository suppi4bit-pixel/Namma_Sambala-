"""Pydantic response schemas for wage verification and comparison."""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ComparisonStatus(str, Enum):
    """Deterministic comparison status code."""
    SHORTFALL_INDICATED = "shortfall_indicated"
    NO_SHORTFALL_INDICATED = "no_shortfall_indicated"
    MORE_DETAILS_NEEDED = "more_details_needed"
    RATE_NOT_VERIFIED = "rate_not_verified"
    INVALID_INPUT = "invalid_input"


class VerifiedRecordDetail(BaseModel):
    """Authoritative legal record details backing the verification."""
    record_id: str = Field(..., description="Unique persistent identifier for the wage record.")
    schedule_name: str = Field(..., description="Official Karnataka Scheduled Employment name.")
    matched_occupation: str = Field(..., description="The matched job title in the schedule.")
    skill_classification: Optional[str] = Field(default=None, description="Skill tier: unskilled, semi_skilled, skilled, highly_skilled (or null).")
    applicable_zone: Optional[str] = Field(default=None, description="Statutory geographical zone (e.g. 'Zone 1').")
    effective_from: str = Field(..., description="Effective start date (YYYY-MM-DD).")
    effective_to: str = Field(..., description="Effective end date (YYYY-MM-DD).")
    basic_wage_monthly: Optional[float] = Field(default=None, description="Statutory basic wage component in INR per month.")
    vda_monthly: Optional[float] = Field(default=None, description="Variable Dearness Allowance component in INR per month.")
    basic_wage_daily: Optional[float] = Field(default=None, description="Statutory basic wage component in INR per day.")
    vda_daily: Optional[float] = Field(default=None, description="Variable Dearness Allowance component in INR per day.")
    total_minimum_wage_monthly: Optional[float] = Field(default=None, description="Total statutory minimum wage in INR per month.")
    total_minimum_wage_daily: Optional[float] = Field(default=None, description="Statutory daily wage in INR.")
    statutory_hours_per_day: int = Field(default=8, description="Standard statutory shift duration.")
    working_days_per_month_basis: int = Field(default=26, description="Statutory days per month basis in Karnataka.")
    legal_authority: str = Field(..., description="Issuing government department or gazette authority.")
    notification_number: str = Field(..., description="Official government notification or circular number.")
    notification_effective_date: Optional[str] = Field(default=None, description="Date parent notification came into force.")
    vda_effective_from: Optional[str] = Field(default=None, description="Start date of VDA index validity window.")
    vda_effective_to: Optional[str] = Field(default=None, description="End date of VDA index validity window.")
    exclusions: Optional[str] = Field(default=None, description="Statutory exclusions (e.g. ULBs, panchayats).")
    qualifications: Optional[str] = Field(default=None, description="Required occupational qualifications if any.")
    source_url: str = Field(..., description="Authoritative reference link.")
    source_document: Optional[str] = Field(default=None, description="Source PDF document filename.")
    verification_notes: str = Field(..., description="Contextual legal details, exclusions, and allowances notes.")


class CalculationDetail(BaseModel):
    """Detailed breakdown of math and normalization assumptions."""
    comparison_period: str = Field(..., description="'monthly', 'daily', or 'hourly'.")
    reported_wage_input: float = Field(..., description="Original wage reported by worker.")
    reported_wage_period: Optional[str] = Field(default=None, description="Original wage period reported by worker ('monthly', 'daily', 'hourly').")
    reported_wage_normalized: float = Field(..., description="Reported wage normalized to comparison period.")
    applicable_statutory_wage: float = Field(..., description="Statutory minimum wage for the comparison period.")
    hours_per_day_used: float = Field(..., description="Working hours used for conversion.")
    working_days_factor_used: int = Field(..., description="Days per month factor used (Karnataka standard: 26).")
    calculation_basis: str = Field(..., description="Description of the mathematical and legal conversion applied.")


class CompareResponse(BaseModel):
    """Master response schema for POST /api/compare."""
    status: ComparisonStatus = Field(..., description="Overall verification outcome status.")
    shortfall_indicated: bool = Field(
        default=False,
        description="True if worker's normalized pay falls below the statutory rate."
    )
    shortfall_amount: Optional[float] = Field(
        default=None,
        description="Shortfall amount in INR for the comparison period (null if no shortfall or unverified)."
    )
    shortfall_percentage: Optional[float] = Field(
        default=None,
        description="Shortfall as a percentage of the statutory minimum wage (null if no shortfall)."
    )
    applicable_minimum_wage: Optional[float] = Field(
        default=None,
        description="Statutory minimum wage rate in INR for the comparison period."
    )
    reported_wage: Optional[float] = Field(
        default=None,
        description="Original un-normalized wage explicitly reported by the worker."
    )
    reported_wage_period: Optional[str] = Field(
        default=None,
        description="Original wage period reported by worker ('monthly', 'daily', 'hourly')."
    )
    reported_wage_normalized: Optional[float] = Field(
        default=None,
        description="Worker's reported wage normalized to the comparison period."
    )
    comparison_period: Optional[str] = Field(
        default=None,
        description="Period basis used for the comparison ('monthly', 'daily', 'hourly')."
    )
    verified_record: Optional[VerifiedRecordDetail] = Field(
        default=None,
        description="Full verified legal citation and rate breakdown."
    )
    calculation_details: Optional[CalculationDetail] = Field(
        default=None,
        description="Detailed normalization and formula breakdown."
    )
    explanation_en: str = Field(
        ...,
        description="Clear English narrative explanation for worker and display."
    )
    explanation_kn: str = Field(
        ...,
        description="Voice-ready Kannada translation of the verification result."
    )
    explanation_hi: Optional[str] = Field(
        default=None,
        description="Voice-ready Hindi translation of the verification result."
    )
    missing_fields: List[str] = Field(
        default_factory=list,
        description="List of missing fields when status is 'more_details_needed'."
    )
    disclaimer: str = Field(
        ...,
        description="Mandatory legal disclaimer noting informative purpose under Minimum Wages Act."
    )
    worker_id: Optional[str] = Field(
        default=None,
        description="Demo worker identifier if provided in request."
    )


class HealthCheckResponse(BaseModel):
    """Response schema for GET /."""
    status: str = Field(default="ok", description="Health status string.")
    service: str = Field(..., description="Service name.")
    version: str = Field(..., description="Service version.")
    verified_records_count: int = Field(..., description="Number of active verified records loaded in memory.")
    jurisdiction: str = Field(..., description="Statutory jurisdiction.")
