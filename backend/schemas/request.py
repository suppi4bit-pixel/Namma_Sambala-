"""Pydantic request schemas for wage verification and comparison."""
import re
from typing import Any, Optional
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

    @field_validator("reported_wage", mode="before")
    @classmethod
    def parse_reported_wage(cls, v: Any) -> Optional[float]:
        if v is None or v == "":
            return None
        if isinstance(v, (int, float)):
            num = float(v)
            if num <= 0:
                raise ValueError("reported_wage must be a positive number greater than 0")
            return num
        if isinstance(v, str):
            cleaned = v.strip()
            # Remove common currency terms in Kannada, Hindi, and English using exact unicode (longest match first)
            cleaned = re.sub(
                r"(?:\u20b9|rs\.?|inr|\u0cb0\u0cc2\u0caa\u0cbe\u0caf\u0cbf\u0c97\u0cb3\u0cc1|\u0cb0\u0cc2\u0caa\u0cbe\u0caf\u0cbf|\u0cb0\u0cc2\.?|\u0930\u0941\u092a\u092f\u094b\u0902|\u0930\u0941\u092a\u092f\u0947|\u0930\u0941\u092a\u092f\u093e|\u0930\u0941\.?|rupees?|rupaye)",
                "",
                cleaned,
                flags=re.IGNORECASE,
            )
            # Remove commas and spaces
            cleaned = cleaned.replace(",", "").replace(" ", "")
            # Check for 'k' suffix e.g. 15k -> 15000, 15.5k -> 15500
            k_match = re.match(r"^([0-9]+(?:\.[0-9]+)?)[kK]$", cleaned)
            if k_match:
                num = float(k_match.group(1)) * 1000.0
                if num <= 0:
                    raise ValueError("reported_wage must be a positive number greater than 0")
                return num
            num_match = re.match(r"^([0-9]+(?:\.[0-9]+)?)$", cleaned)
            if num_match:
                num = float(num_match.group(1))
                if num <= 0:
                    raise ValueError("reported_wage must be a positive number greater than 0")
                return num
            raise ValueError(f"Unable to parse wage amount: '{v}'")
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
