"""Pydantic schemas for Gemini voice extraction."""
import re
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator
from backend.schemas.request import CompareRequest


class ExtractionRequest(BaseModel):
    """Input payload for POST /api/extract."""
    transcript: str = Field(
        ...,
        min_length=1,
        description="Kannada, Hindi, or English worker transcript (including understandable transliteration or code-switching) to extract wage information from."
    )


class ExtractedWageProfile(BaseModel):
    """Structured wage profile extracted from transcript.

    Contains strictly worker-reported facts without statutory conclusions or wage rate math.
    """
    @model_validator(mode="before")
    @classmethod
    def check_unsupported_skills(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw_skill = data.get("skill_category")
            if raw_skill is not None:
                norm = str(raw_skill).strip().lower().replace("-", "_").replace(" ", "_")
                allowed = {"unskilled", "semi_skilled", "skilled", "highly_skilled"}
                if norm not in allowed and norm != "none" and norm != "null":
                    missing = list(data.get("missing_or_uncertain_fields") or [])
                    if "skill_category" not in missing:
                        missing.append("skill_category")
                    data["missing_or_uncertain_fields"] = missing
                    data["confirmation_required"] = True
                    note = data.get("confidence_notes") or ""
                    data["confidence_notes"] = (
                        f"{note} Unsupported skill category '{raw_skill}' is not a recognized statutory classification."
                    ).strip()
                    data["skill_category"] = None
        return data

    original_transcript: str = Field(
        ...,
        description="Verbatim input transcript in Kannada, Hindi, or English."
    )
    location: Optional[str] = Field(
        default=None,
        description="Reported work location or area in Bengaluru, or null if unstated."
    )
    sector: Optional[str] = Field(
        default=None,
        description="Reported broad employment sector (e.g. 'Security Agencies', 'Shops & Commercial', 'Building & Construction', 'Domestic Work'), or null."
    )
    job_role: Optional[str] = Field(
        default=None,
        description="Reported occupation or job title (e.g. 'security_guard', 'salesman', 'helper', 'mason', 'domestic_worker'), or null."
    )
    skill_category: Optional[str] = Field(
        default=None,
        description="Explicit skill tier ONLY if explicitly stated by worker: 'unskilled', 'semi_skilled', 'skilled', 'highly_skilled', or null."
    )
    wage_amount: Optional[float] = Field(
        default=None,
        description="Numerical wage amount reported by the worker in INR, or null if unstated."
    )
    wage_period: Optional[str] = Field(
        default=None,
        description="Wage payment period: 'monthly', 'daily', or 'hourly', or null if unstated. Never default to monthly."
    )
    working_hours_per_day: Optional[float] = Field(
        default=None,
        description="Explicitly reported shift hours per day, or null if the worker did not state them. Never assume a standard 8-hour shift."
    )
    days_worked_per_week: Optional[int] = Field(
        default=None,
        description="Explicitly reported working days per week (1-7), or null if the worker did not state them. Never assume standard working days."
    )
    overtime_details: Optional[str] = Field(
        default=None,
        description="Reported overtime information, or null if none reported."
    )
    missing_or_uncertain_fields: List[str] = Field(
        default_factory=list,
        description="List of required or ambiguous fields needing clarification."
    )
    confirmation_required: bool = Field(
        default=False,
        description="True if worker confirmation is required due to missing or uncertain fields."
    )
    confidence_notes: Optional[str] = Field(
        default=None,
        description="Brief note on extraction certainty, dialect nuances, or unmapped classifications."
    )

    @field_validator("wage_period")
    @classmethod
    def validate_wage_period(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            normalized = v.strip().lower()
            allowed = {"monthly", "daily", "hourly"}
            if normalized in allowed:
                return normalized
            return None
        return None

    @field_validator("skill_category")
    @classmethod
    def validate_skill_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            normalized = v.strip().lower().replace("-", "_").replace(" ", "_")
            allowed = {"unskilled", "semi_skilled", "skilled", "highly_skilled"}
            if normalized in allowed:
                return normalized
            return None
        return None

    @field_validator("wage_amount", mode="before")
    @classmethod
    def validate_wage_amount(cls, v: Any) -> Optional[float]:
        if v is None or v == "":
            return None
        if isinstance(v, (int, float)):
            num = float(v)
            return num if num > 0 else None
        if isinstance(v, str):
            cleaned = v.strip()
            cleaned = re.sub(
                r"(?:\u20b9|rs\.?|inr|\u0cb0\u0cc2\u0caa\u0cbe\u0caf\u0cbf\u0c97\u0cb3\u0cc1|\u0cb0\u0cc2\u0caa\u0cbe\u0caf\u0cbf|\u0cb0\u0cc2\.?|\u0930\u0941\u092a\u092f\u094b\u0902|\u0930\u0941\u092a\u092f\u0947|\u0930\u0941\u092a\u092f\u093e|\u0930\u0941\.?|rupees?|rupaye)",
                "",
                cleaned,
                flags=re.IGNORECASE,
            )
            cleaned = cleaned.replace(",", "").replace(" ", "")
            k_match = re.match(r"^([0-9]+(?:\.[0-9]+)?)[kK]$", cleaned)
            if k_match:
                num = float(k_match.group(1)) * 1000.0
                return num if num > 0 else None
            num_match = re.match(r"^([0-9]+(?:\.[0-9]+)?)$", cleaned)
            if num_match:
                num = float(num_match.group(1))
                return num if num > 0 else None
        return None


    def to_compare_request(self) -> Optional[CompareRequest]:
        """Convert extracted profile to teammate's CompareRequest if minimum fields exist.

        Strictly returns None if:
        - job_role is missing
        - wage_amount is missing or <= 0
        - wage_period is missing or not in {'monthly', 'daily', 'hourly'} (never defaults to monthly)
        - wage_period is 'hourly' and working_hours_per_day is missing or <= 0
        """
        if not self.job_role or not self.job_role.strip():
            return None
        if self.wage_amount is None or self.wage_amount <= 0:
            return None
        if not self.wage_period or self.wage_period not in {"monthly", "daily", "hourly"}:
            return None
        if self.wage_period == "hourly" and (self.working_hours_per_day is None or self.working_hours_per_day <= 0):
            return None

        # Locality handling: preserve Zone 1 tokens, qualify recognized Bengaluru localities,
        # but do not automatically treat arbitrary outside locations as Bengaluru Zone 1
        loc = self.location.strip() if self.location else "Bengaluru"
        norm_loc = loc.lower()
        zone1_tokens = {"bengaluru", "bangalore", "bbmp", "zone 1", "zone1", "zone i", "blr"}
        known_bengaluru_areas = {
            "koramangala", "whitefield", "peenya", "indiranagar", "jayanagar",
            "electronic city", "marathahalli", "yelahanka", "hebbal", "btm",
            "rajajinagar", "malleshwaram", "shivajinagar", "bellandur", "hsr",
            "bommanahalli", "banashankari", "basavanagudi", "yeshwanthpur",
            "kengeri", "kr puram", "mahadevapura", "sarjapur", "domlur"
        }
        if not any(idf in norm_loc for idf in zone1_tokens):
            if any(area in norm_loc for area in known_bengaluru_areas):
                loc = f"{loc}, Bengaluru"

        return CompareRequest(
            job_category=self.job_role,
            reported_wage=self.wage_amount,
            wage_period=self.wage_period,
            skill_classification=self.skill_category,
            location=loc,
            hours_per_day=self.working_hours_per_day,
        )


class ExtractionResponse(BaseModel):
    """API response model for POST /api/extract."""
    status: str = Field(default="ok", description="'ok' or 'error'.")
    data: Optional[ExtractedWageProfile] = Field(
        default=None,
        description="Extracted worker wage profile."
    )
    error: Optional[str] = Field(
        default=None,
        description="Error explanation if status is 'error'."
    )
