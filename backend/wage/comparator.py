"""Deterministic wage comparison engine.

Strictly adheres to:
1. Pure deterministic Python logic (no LLM in the calculation path).
2. Authoritative verified Karnataka Labour Department notifications.
3. Safe period conversions (26-day basis, 8-hour shift).
4. Sourced legal citations and bilingual explanations (EN + KN).
"""
import logging
from typing import List, Optional

from backend.schemas.request import CompareRequest
from backend.schemas.response import (
    CalculationDetail,
    CompareResponse,
    ComparisonStatus,
    VerifiedRecordDetail,
)
from backend.wage.normalizer import normalize_and_align_wage
from backend.wage.repository import WageRepository, wage_repo

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "This wage verification is provided for informational and wage awareness purposes "
    "under the Karnataka Minimum Wages Act, 1948 notifications and does not constitute "
    "formal legal counsel. Actual entitlements may vary based on overtime, specialized "
    "allowances, and formal employment contracts."
)


def format_period_kn(period: str) -> str:
    """Return Kannada translation for wage period."""
    mapping = {
        "monthly": "ತಿಂಗಳಿಗೆ",
        "daily": "ದಿನಕ್ಕೆ",
        "hourly": "ಗಂಟೆಗೆ",
    }
    return mapping.get(period.lower(), period)


def format_skill_kn(skill: str) -> str:
    """Return Kannada translation for skill category."""
    mapping = {
        "unskilled": "ಅಕುಶಲ",
        "semi_skilled": "ಅರೆ-ಕುಶಲ",
        "skilled": "ಕುಶಲ",
        "highly_skilled": "ಉನ್ನತ ಕುಶಲ",
    }
    return mapping.get(skill.lower(), skill)


def compare_wage(
    request: CompareRequest,
    repository: Optional[WageRepository] = None,
) -> CompareResponse:
    """Perform deterministic legal minimum wage verification."""
    repo = repository or wage_repo

    # 1. Incomplete input validation
    missing_fields: List[str] = []
    if not request.job_category or not request.job_category.strip():
        missing_fields.append("job_category")
    if request.reported_wage is None:
        missing_fields.append("reported_wage")

    if missing_fields:
        missing_str = ", ".join(missing_fields)
        return CompareResponse(
            status=ComparisonStatus.MORE_DETAILS_NEEDED,
            shortfall_indicated=False,
            missing_fields=missing_fields,
            explanation_en=f"Incomplete details provided. Please provide: {missing_str}.",
            explanation_kn=f"ಅಪೂರ್ಣ ವಿವರಗಳನ್ನು ನೀಡಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಈ ಮಾಹಿತಿಯನ್ನು ನೀಡಿ: {missing_str}.",
            disclaimer=DISCLAIMER_TEXT,
            worker_id=request.worker_id,
        )

    # 2. Invalid wage value validation
    if request.reported_wage <= 0:
        return CompareResponse(
            status=ComparisonStatus.INVALID_INPUT,
            shortfall_indicated=False,
            explanation_en=f"Reported wage must be greater than zero. Received: {request.reported_wage}.",
            explanation_kn=f"ವೇತನವು ಶೂನ್ಯಕ್ಕಿಂತ ಹೆಚ್ಚಿರಬೇಕು. ನೀಡಲಾದ ಮೊತ್ತ: {request.reported_wage}.",
            disclaimer=DISCLAIMER_TEXT,
            worker_id=request.worker_id,
        )

    # 3. Match against authoritative verified dataset
    record, match_status, matched_title = repo.find_matching_record(
        job_category=request.job_category,
        skill_classification=request.skill_classification,
        location=request.location,
        zone=request.zone,
    )

    if match_status == "unverified_zone":
        return CompareResponse(
            status=ComparisonStatus.RATE_NOT_VERIFIED,
            shortfall_indicated=False,
            explanation_en=(
                f"Statutory minimum wage rate is not verified for location '{request.location}' "
                f"or zone '{request.zone}'. Namma Sambala currently verifies Karnataka Zone 1 (BBMP Bengaluru)."
            ),
            explanation_kn=(
                f"ಸ್ಥಳ '{request.location}' ಅಥವಾ ವಲಯ '{request.zone}' ಗಾಗಿ ಕನಿಷ್ಠ ವೇತನ ದರವು ಪರಿಶೀಲಿಸಲ್ಪಟ್ಟಿಲ್ಲ. "
                "ನಮ್ಮ ಸಂಬಳ ಪ್ರಸ್ತುತ ಕರ್ನಾಟಕ ವಲಯ 1 (ಬಿಬಿಎಂಪಿ ಬೆಂಗಳೂರು) ದರಗಳನ್ನು ಮಾತ್ರ ಪರಿಶೀಲಿಸುತ್ತದೆ."
            ),
            disclaimer=DISCLAIMER_TEXT,
            worker_id=request.worker_id,
        )

    if match_status == "ambiguous_skill":
        return CompareResponse(
            status=ComparisonStatus.MORE_DETAILS_NEEDED,
            shortfall_indicated=False,
            missing_fields=["skill_classification"],
            explanation_en=(
                f"The job category '{request.job_category}' has multiple skill classifications "
                "(e.g., unskilled, semi-skilled, skilled) with different statutory wage rates. "
                "Please specify your skill level or exact job role."
            ),
            explanation_kn=(
                f"'{request.job_category}' ಉದ್ಯೋಗ ವರ್ಗವು ವಿವಿಧ ಕೌಶಲ್ಯ ಮಟ್ಟಗಳನ್ನು ಹೊಂದಿದೆ "
                "(ಉದಾ: ಅಕುಶಲ, ಅರೆ-ಕುಶಲ, ಕುಶಲ). ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಿರ್ದಿಷ್ಟ ಕೌಶಲ್ಯ ಮಟ್ಟವನ್ನು ಅಥವಾ ಪಾತ್ರವನ್ನು ತಿಳಿಸಿ."
            ),
            disclaimer=DISCLAIMER_TEXT,
            worker_id=request.worker_id,
        )

    if match_status == "unmatched_occupation" or not record:
        return CompareResponse(
            status=ComparisonStatus.RATE_NOT_VERIFIED,
            shortfall_indicated=False,
            explanation_en=(
                f"No verified statutory minimum wage record was found for job category '{request.job_category}'. "
                "To prevent misleading comparisons, unverified or unmapped occupations are not evaluated."
            ),
            explanation_kn=(
                f"'{request.job_category}' ಉದ್ಯೋಗಕ್ಕೆ ಯಾವುದೇ ಪರಿಶೀಲಿಸಿದ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ದಾಖಲೆ ಕಂಡುಬಂದಿಲ್ಲ. "
                "ತಪ್ಪಾದ ಹೋಲಿಕೆಗಳನ್ನು ತಡೆಯಲು, ಪರಿಶೀಲಿಸದ ಉದ್ಯೋಗಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಲಾಗುವುದಿಲ್ಲ."
            ),
            disclaimer=DISCLAIMER_TEXT,
            worker_id=request.worker_id,
        )

    # 4. Period normalization and alignment
    norm_result = normalize_and_align_wage(
        reported_wage=request.reported_wage,
        reported_period=request.wage_period or "monthly",
        statutory_monthly=record["total_minimum_wage_monthly"],
        statutory_daily=record["total_minimum_wage_daily"],
        hours_per_day=request.hours_per_day,
        days_per_month=request.days_per_month,
    )

    if not norm_result.success:
        missing_req = [norm_result.missing_requirement] if norm_result.missing_requirement else []
        return CompareResponse(
            status=ComparisonStatus.MORE_DETAILS_NEEDED,
            shortfall_indicated=False,
            missing_fields=missing_req,
            explanation_en=(
                f"Cannot compute legally justified comparison: {norm_result.calculation_basis} "
                "Please provide working hours per day for hourly wage rates."
            ),
            explanation_kn=(
                "ಕಾನೂನುಬದ್ಧ ಹೋಲಿಕೆಯನ್ನು ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ: ಗಂಟೆಯ ವೇತನಕ್ಕಾಗಿ ದಯವಿಟ್ಟು ದಿನದ ಕೆಲಸದ ಅವಧಿಯನ್ನು (ಗಂಟೆಗಳು) ತಿಳಿಸಿ."
            ),
            disclaimer=DISCLAIMER_TEXT,
            worker_id=request.worker_id,
        )

    # 5. Deterministic calculation
    statutory_target = norm_result.applicable_statutory_wage
    reported_target = norm_result.reported_wage_normalized
    period_str = norm_result.comparison_period
    period_kn = format_period_kn(period_str)
    skill_kn = format_skill_kn(record["skill_classification"]) if record.get("skill_classification") else "ಸಾಮಾನ್ಯ"
    skill_title = (
        record["skill_classification"].replace("_", " ").title()
        if record.get("skill_classification")
        else "General / Unclassified"
    )

    verified_detail = VerifiedRecordDetail(
        record_id=record["record_id"],
        schedule_name=record["schedule_name"],
        matched_occupation=matched_title or request.job_category,
        skill_classification=record.get("skill_classification"),
        applicable_zone=record.get("applicable_zone"),
        effective_from=record["effective_from"],
        effective_to=record["effective_to"],
        basic_wage_monthly=record.get("basic_wage_monthly"),
        vda_monthly=record.get("vda_monthly"),
        basic_wage_daily=record.get("basic_wage_daily"),
        vda_daily=record.get("vda_daily"),
        total_minimum_wage_monthly=record.get("total_minimum_wage_monthly"),
        total_minimum_wage_daily=record.get("total_minimum_wage_daily"),
        statutory_hours_per_day=record.get("statutory_hours_per_day", 8),
        working_days_per_month_basis=record.get("working_days_per_month_basis", 26),
        legal_authority=record["legal_authority"],
        notification_number=record["notification_number"],
        notification_effective_date=record.get("notification_effective_date"),
        vda_effective_from=record.get("vda_effective_from"),
        vda_effective_to=record.get("vda_effective_to"),
        exclusions=record.get("exclusions"),
        qualifications=record.get("qualifications"),
        source_url=record["source_url"],
        source_document=record.get("source_document") or record.get("pdf_file"),
        verification_notes=record["verification_notes"],
    )

    calc_detail = CalculationDetail(
        comparison_period=norm_result.comparison_period,
        reported_wage_input=request.reported_wage,
        reported_wage_normalized=reported_target,
        applicable_statutory_wage=statutory_target,
        hours_per_day_used=norm_result.hours_per_day_used,
        working_days_factor_used=norm_result.working_days_factor_used,
        calculation_basis=norm_result.calculation_basis,
    )

    difference = round(statutory_target - reported_target, 2)
    zone_str = f" for {record['applicable_zone']}" if record.get("applicable_zone") else ""
    zone_kn = f"{record['applicable_zone']} (ಬಿಬಿಎಂಪಿ ಬೆಂಗಳೂರು) ವ್ಯಾಪ್ತಿಯಲ್ಲಿ " if record.get("applicable_zone") else ""

    # Shortfall check: allow a 1-paisa threshold for rounding
    if difference > 0.05:
        shortfall_pct = round((difference / statutory_target) * 100, 2)
        basic_monthly_str = f"Basic ₹{record['basic_wage_monthly']:,.2f} + " if record.get("basic_wage_monthly") else ""
        vda_monthly_str = f"VDA ₹{record['vda_monthly']:,.2f} monthly equivalent" if record.get("vda_monthly") else ""
        component_breakdown = f" ({basic_monthly_str}{vda_monthly_str})" if (basic_monthly_str or vda_monthly_str) else ""

        exp_en = (
            f"Under {record['legal_authority']} ({record['notification_number']}){zone_str} "
            f"({record['schedule_name']} - {skill_title}), "
            f"the statutory minimum wage is ₹{statutory_target:,.2f} per {period_str}"
            f"{component_breakdown}. "
            f"Your normalized wage of ₹{reported_target:,.2f} indicates a shortfall of ₹{difference:,.2f} per {period_str} "
            f"({shortfall_pct:.1f}% below legal minimum rate)."
        )
        exp_kn = (
            f"ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ ಅಧಿಸೂಚನೆ ({record['notification_number']}) ಪ್ರಕಾರ, "
            f"{zone_kn}{record['schedule_name']} - "
            f"{skill_kn} ವರ್ಗಕ್ಕೆ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ಪ್ರತಿ {period_kn} ₹{statutory_target:,.2f}. "
            f"ನೀವು ತಿಳಿಸಿದ ವೇತನ ₹{reported_target:,.2f} ಆಗಿದ್ದು, ಇದು ಕಾನೂನುಬದ್ಧ ಕನಿಷ್ಠ ವೇತನಕ್ಕಿಂತ "
            f"₹{difference:,.2f} ಕಡಿಮೆಯಾಗಿದೆ ({shortfall_pct:.1f}% ಕೊರತೆ)."
        )

        return CompareResponse(
            status=ComparisonStatus.SHORTFALL_INDICATED,
            shortfall_indicated=True,
            shortfall_amount=difference,
            shortfall_percentage=shortfall_pct,
            applicable_minimum_wage=statutory_target,
            reported_wage_normalized=reported_target,
            comparison_period=period_str,
            verified_record=verified_detail,
            calculation_details=calc_detail,
            explanation_en=exp_en,
            explanation_kn=exp_kn,
            missing_fields=[],
            disclaimer=DISCLAIMER_TEXT,
            worker_id=request.worker_id,
        )
    else:
        exp_en = (
            f"Under {record['legal_authority']} ({record['notification_number']}){zone_str} "
            f"({record['schedule_name']} - {skill_title}), "
            f"the statutory minimum wage is ₹{statutory_target:,.2f} per {period_str}. "
            f"Your normalized wage of ₹{reported_target:,.2f} meets or exceeds the statutory minimum wage rate."
        )
        exp_kn = (
            f"ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ ಅಧಿಸೂಚನೆ ({record['notification_number']}) ಪ್ರಕಾರ, "
            f"{zone_kn}{record['schedule_name']} - "
            f"{skill_kn} ವರ್ಗಕ್ಕೆ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ಪ್ರತಿ {period_kn} ₹{statutory_target:,.2f}. "
            f"ನೀವು ತಿಳಿಸಿದ ವೇತನ ₹{reported_target:,.2f} ಕನಿಷ್ಠ ವೇತನಕ್ಕಿಂತ ಸಮನಾಗಿದೆ ಅಥವಾ ಹೆಚ್ಚಾಗಿದೆ."
        )

        return CompareResponse(
            status=ComparisonStatus.NO_SHORTFALL_INDICATED,
            shortfall_indicated=False,
            shortfall_amount=0.0,
            shortfall_percentage=0.0,
            applicable_minimum_wage=statutory_target,
            reported_wage_normalized=reported_target,
            comparison_period=period_str,
            verified_record=verified_detail,
            calculation_details=calc_detail,
            explanation_en=exp_en,
            explanation_kn=exp_kn,
            missing_fields=[],
            disclaimer=DISCLAIMER_TEXT,
            worker_id=request.worker_id,
        )
