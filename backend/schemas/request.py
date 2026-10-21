"""Pydantic request schemas for wage verification and comparison."""
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class CompareRequest(BaseModel):
    """Input payload for POST /api/compare.
    
    Coordinates the shared schema with Suprada (Voice/Extraction) and Vibha (React UI).
    """
    worker_id: Optional[str] = Field(
        default=None,
        description="Fictional/demo identifier for worker tracking across voice session."
    )
    job_category: Optional[str] = Field(
        default=None,
        description="Reported job title or occupation (e.g. 'security_guard', 'salesman', 'helper', 'mason', 'domestic_worker')."
    )
    skill_classification: Optional[str] = Field(
        default=None,
        description="Skill level: 'unskilled', 'semi_skilled', 'skilled', 'highly_skilled'. Can be inferred if job title is specific."
    )
    reported_wage: Optional[float] = Field(
        default=None,
        description="Wage amount reported by worker in INR (must be > 0)."
    )
    wage_period: Optional[str] = Field(
        default="monthly",
        description="Period for reported wage: 'monthly', 'daily', or 'hourly'."
    )
    location: Optional[str] = Field(
        default="Bengaluru",
        description="Reported location/city (default: Bengaluru)."
    )
    zone: Optional[str] = Field(
        default=None,
        description="Statutory wage zone (e.g., 'Zone 1' for BBMP Bengaluru). If None, inferred from location."
    )
    hours_per_day: Optional[float] = Field(
        default=None,
        description="Reported working hours per day. Default is 8.0 for full-time standard shifts. Required for hourly comparisons."
    )
    days_per_month: Optional[int] = Field(
        default=None,
        description="Reported working days per month. Default is statutory 26 days under Karnataka labour rules."
    )
    preferred_language: Optional[str] = Field(
        default="en",
        description="Preferred language for output explanations: 'en' (English) or 'kn' (Kannada)."
    )

    @field_validator("wage_period")
    @classmethod
    def validate_wage_period(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            normalized = v.strip().lower()
            allowed = {"monthly", "daily", "hourly"}
            if normalized not in allowed:
                raise ValueError(f"wage_period must be one of {allowed}, got '{v}'")
            return normalized
        return "monthly"

    @field_validator("reported_wage")
    @classmethod
    def validate_reported_wage(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("reported_wage must be a positive number greater than 0")
        return v

    @field_validator("skill_classification")
    @classmethod
    def validate_skill(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            normalized = v.strip().lower().replace("-", "_").replace(" ", "_")
            allowed = {"unskilled", "semi_skilled", "skilled", "highly_skilled"}
            if normalized not in allowed:
                raise ValueError(f"skill_classification must be one of {allowed}, got '{v}'")
            return normalized
        return None
