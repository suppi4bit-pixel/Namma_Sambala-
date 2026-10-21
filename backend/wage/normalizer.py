"""Wage period normalization and statutory conversion engine.

Implements Karnataka Minimum Wage Rules:
- 26 paid working days per month (with 4 paid rest days).
- 8 hours standard shift per day.
- Legally justified conversions between hourly, daily, and monthly periods.
"""
from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class NormalizationResult:
    """Result of wage normalization."""
    success: bool
    comparison_period: str
    reported_wage_normalized: float
    applicable_statutory_wage: float
    hours_per_day_used: float
    working_days_factor_used: int
    calculation_basis: str
    missing_requirement: Optional[str] = None


def normalize_and_align_wage(
    reported_wage: float,
    reported_period: str,
    statutory_monthly: float,
    statutory_daily: float,
    hours_per_day: Optional[float] = None,
    days_per_month: Optional[int] = None,
) -> NormalizationResult:
    """Safely and deterministically align reported wage with statutory wage.

    Rules:
    1. Monthly wage: Compared directly against statutory monthly rate (basis: 26 working days).
    2. Daily wage:
       - If days_per_month is provided, converts to monthly: reported * days_per_month vs statutory_monthly.
       - If days_per_month is not provided, compared directly on daily basis: reported vs statutory_daily.
    3. Hourly wage:
       - Requires hours_per_day to be explicitly confirmed. If missing, cannot assume 8 hours (especially for part-time/domestic work).
       - If hours_per_day is provided: converts to hourly comparison (statutory_daily / 8.0) vs reported hourly wage.
    """
    period = reported_period.lower().strip()
    standard_hours = 8.0
    standard_days = 26

    if period == "monthly":
        effective_days = days_per_month or standard_days
        effective_hours = hours_per_day or standard_hours
        return NormalizationResult(
            success=True,
            comparison_period="monthly",
            reported_wage_normalized=round(reported_wage, 2),
            applicable_statutory_wage=round(statutory_monthly, 2),
            hours_per_day_used=effective_hours,
            working_days_factor_used=effective_days,
            calculation_basis="Direct monthly comparison against Karnataka statutory monthly minimum wage (based on 26 working days)."
        )

    elif period == "daily":
        if days_per_month is not None and days_per_month > 0:
            normalized_monthly = reported_wage * days_per_month
            effective_hours = hours_per_day or standard_hours
            return NormalizationResult(
                success=True,
                comparison_period="monthly",
                reported_wage_normalized=round(normalized_monthly, 2),
                applicable_statutory_wage=round(statutory_monthly, 2),
                hours_per_day_used=effective_hours,
                working_days_factor_used=days_per_month,
                calculation_basis=f"Reported daily wage (₹{reported_wage:.2f}) converted to monthly based on worker's reported {days_per_month} working days/month."
            )
        else:
            effective_hours = hours_per_day or standard_hours
            return NormalizationResult(
                success=True,
                comparison_period="daily",
                reported_wage_normalized=round(reported_wage, 2),
                applicable_statutory_wage=round(statutory_daily, 2),
                hours_per_day_used=effective_hours,
                working_days_factor_used=standard_days,
                calculation_basis="Direct daily comparison against statutory daily minimum wage (monthly statutory rate / 26 days)."
            )

    elif period == "hourly":
        if hours_per_day is None or hours_per_day <= 0:
            return NormalizationResult(
                success=False,
                comparison_period="hourly",
                reported_wage_normalized=0.0,
                applicable_statutory_wage=0.0,
                hours_per_day_used=0.0,
                working_days_factor_used=standard_days,
                calculation_basis="Conversion failed: Hourly wage cannot be evaluated without confirmed daily working hours.",
                missing_requirement="hours_per_day"
            )

        # Statutory hourly rate is statutory daily wage divided by 8 standard hours
        statutory_hourly = round(statutory_daily / standard_hours, 2)
        effective_days = days_per_month or standard_days
        return NormalizationResult(
            success=True,
            comparison_period="hourly",
            reported_wage_normalized=round(reported_wage, 2),
            applicable_statutory_wage=statutory_hourly,
            hours_per_day_used=hours_per_day,
            working_days_factor_used=effective_days,
            calculation_basis=f"Hourly comparison against statutory hourly rate (₹{statutory_daily:.2f}/8 hrs = ₹{statutory_hourly:.2f}/hr) with confirmed {hours_per_day} hrs/day shift."
        )

    return NormalizationResult(
        success=False,
        comparison_period=period,
        reported_wage_normalized=0.0,
        applicable_statutory_wage=0.0,
        hours_per_day_used=standard_hours,
        working_days_factor_used=standard_days,
        calculation_basis=f"Unsupported wage period: '{period}'",
        missing_requirement="wage_period"
    )
