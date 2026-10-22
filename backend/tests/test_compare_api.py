"""Integration tests for POST /api/compare endpoint."""
from fastapi.testclient import TestClient
from backend.main import app
from backend.schemas.response import ComparisonStatus

client = TestClient(app)


def test_compare_security_guard_shortfall():
    """Verify shortfall indicated for security guard earning below minimum wage.

    Statutory: ₹17,965.86 / month (Zone 1 Semi-Skilled).
    Reported: ₹12,000.00.
    Expected Shortfall: ₹5,965.86 (approx 33.21%).
    """
    payload = {
        "worker_id": "demo-worker-01",
        "job_category": "security_guard",
        "reported_wage": 12000.0,
        "wage_period": "monthly",
        "location": "Bengaluru",
        "zone": "Zone 1",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.SHORTFALL_INDICATED.value
    assert data["shortfall_indicated"] is True
    assert data["shortfall_amount"] == 5965.86
    assert data["shortfall_percentage"] == 33.21
    assert data["applicable_minimum_wage"] == 17965.86
    assert data["verified_record"] is not None
    assert data["verified_record"]["schedule_name"] == "Security Agency / Private Security Guards"
    assert "ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ" in data["explanation_kn"]
    assert "₹5,965.86" in data["explanation_en"]
    assert len(data["disclaimer"]) > 10


def test_compare_security_guard_no_shortfall():
    """Verify no shortfall indicated for security guard earning at or above legal rate."""
    payload = {
        "worker_id": "demo-worker-02",
        "job_category": "security_guard",
        "reported_wage": 18500.0,
        "wage_period": "monthly",
        "location": "Bengaluru",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.NO_SHORTFALL_INDICATED.value
    assert data["shortfall_indicated"] is False
    assert data["shortfall_amount"] == 0.0
    assert data["shortfall_percentage"] == 0.0
    assert "meets or exceeds" in data["explanation_en"]


def test_compare_daily_wage_helper_shortfall():
    """Verify daily wage comparison for commercial helper."""
    # Statutory daily for helper (unskilled shops): ₹581.01.
    payload = {
        "job_category": "helper",
        "reported_wage": 450.0,
        "wage_period": "daily",
        "location": "Bengaluru",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.SHORTFALL_INDICATED.value
    assert data["comparison_period"] == "daily"
    assert data["applicable_minimum_wage"] == 581.01
    assert data["shortfall_amount"] == 131.01


def test_compare_hourly_wage_without_hours_fails():
    """Verify that hourly wage without hours_per_day returns more_details_needed."""
    payload = {
        "job_category": "domestic_worker",
        "reported_wage": 60.0,
        "wage_period": "hourly",
        "location": "Bengaluru",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.MORE_DETAILS_NEEDED.value
    assert "hours_per_day" in data["missing_fields"]
    assert data["shortfall_indicated"] is False


def test_compare_hourly_wage_with_hours_succeeds():
    """Verify hourly wage with confirmed daily hours calculates correctly."""
    # Domestic unskilled statutory: ₹669.61 daily / 8 = ₹83.70/hr.
    payload = {
        "job_category": "domestic_worker",
        "reported_wage": 60.0,
        "wage_period": "hourly",
        "hours_per_day": 4.0,
        "location": "Bengaluru",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.SHORTFALL_INDICATED.value
    assert data["comparison_period"] == "hourly"
    assert data["applicable_minimum_wage"] == 83.70
    assert data["shortfall_amount"] == 23.70


def test_compare_missing_job_category():
    """Verify missing job_category returns more_details_needed."""
    payload = {
        "reported_wage": 14000.0,
        "wage_period": "monthly",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.MORE_DETAILS_NEEDED.value
    assert "job_category" in data["missing_fields"]


def test_compare_missing_reported_wage():
    """Verify missing reported_wage returns more_details_needed."""
    payload = {
        "job_category": "mason",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.MORE_DETAILS_NEEDED.value
    assert "reported_wage" in data["missing_fields"]


def test_compare_unknown_job_category():
    """Verify unknown job category returns rate_not_verified."""
    payload = {
        "job_category": "aircraft_pilot",
        "reported_wage": 50000.0,
        "wage_period": "monthly",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.RATE_NOT_VERIFIED.value
    assert "No verified statutory minimum wage record was found" in data["explanation_en"]


def test_compare_ambiguous_skill_classification():
    """Verify ambiguous role requiring skill tier returns more_details_needed."""
    payload = {
        "job_category": "commercial_worker",
        "reported_wage": 14000.0,
        "wage_period": "monthly",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.MORE_DETAILS_NEEDED.value
    assert "skill_classification" in data["missing_fields"]


def test_compare_unverified_outside_zone():
    """Verify non-Zone 1 / outside Bengaluru location returns rate_not_verified."""
    payload = {
        "job_category": "security_guard",
        "reported_wage": 12000.0,
        "wage_period": "monthly",
        "location": "Mysuru Rural",
        "zone": "Zone 4",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.RATE_NOT_VERIFIED.value
    assert "not verified" in data["explanation_en"]


def test_compare_invalid_negative_wage():
    """Verify negative wage is caught as invalid input."""
    payload = {
        "job_category": "security_guard",
        "reported_wage": -500.0,
        "wage_period": "monthly",
    }
    response = client.post("/api/compare", json=payload)
    # Pydantic validator catches reported_wage <= 0 as 422 with structured body
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == ComparisonStatus.INVALID_INPUT.value


def test_compare_invalid_wage_period():
    """Verify invalid wage period is caught by validator."""
    payload = {
        "job_category": "security_guard",
        "reported_wage": 15000.0,
        "wage_period": "annually",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == ComparisonStatus.INVALID_INPUT.value


def test_compare_cleaner_zone1_shortfall():
    """Verify shortfall calculation for verified private cleaner (Safai Karmachari) in Zone 1.

    Statutory: ₹22,282.90 / month (Basic: ₹19,028.50 + VDA: ₹3,254.40).
    Reported: ₹18,000.00 / month.
    Expected Shortfall: ₹4,282.90.
    """
    payload = {
        "job_category": "safai_karmachari",
        "reported_wage": 18000.0,
        "wage_period": "monthly",
        "location": "Bengaluru",
        "zone": "Zone 1",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.SHORTFALL_INDICATED.value
    assert data["shortfall_indicated"] is True
    assert data["applicable_minimum_wage"] == 22282.90
    assert data["shortfall_amount"] == 4282.90
    assert data["verified_record"] is not None
    vr = data["verified_record"]
    assert vr["record_id"] == "KA-MW-CLEAN-2026-Z1"
    assert "Safai Karmacharis" in vr["schedule_name"]
    assert vr["source_document"] == "cleaner.pdf"
    assert "KAE 105 LWA 2021" in vr["notification_number"]
    assert vr["notification_effective_date"] == "2022-07-28"
    assert vr["vda_effective_from"] == "2026-04-01"
    assert vr["vda_effective_to"] == "2027-03-31"


def test_compare_cleaner_zone1_no_shortfall():
    """Verify no shortfall when cleaner wage meets or exceeds Zone 1 statutory minimum."""
    payload = {
        "job_category": "safai_karmachari",
        "reported_wage": 23000.0,
        "wage_period": "monthly",
        "location": "Bengaluru",
        "zone": "Zone 1",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.NO_SHORTFALL_INDICATED.value
    assert data["shortfall_indicated"] is False
    assert data["shortfall_amount"] == 0.0


def test_compare_generic_cleaner_ambiguous_without_skill():
    """Verify generic 'cleaner' spans shops vs safai karmachari and requests clarification."""
    payload = {
        "job_category": "cleaner",
        "reported_wage": 16000.0,
        "wage_period": "monthly",
        "location": "Bengaluru",
        "zone": "Zone 1",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.MORE_DETAILS_NEEDED.value
    assert "skill_classification" in data["missing_fields"]



def test_compare_cleaner_zone1_daily():
    """Verify cleaner daily rate comparison against Zone 1 statutory daily rate (₹857.07)."""
    payload = {
        "job_category": "safai_karmachari",
        "reported_wage": 750.0,
        "wage_period": "daily",
        "location": "Bengaluru",
        "zone": "Zone 1",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.SHORTFALL_INDICATED.value
    assert data["comparison_period"] == "daily"
    assert data["applicable_minimum_wage"] == 857.07
    assert data["shortfall_amount"] == 107.07


def test_compare_cleaner_outside_zone1_returns_rate_not_verified():
    """Verify cleaner in Zone 2 / outside Bengaluru returns rate_not_verified because Zone 2 is unverified."""
    payload = {
        "job_category": "safai_karmachari",
        "reported_wage": 18000.0,
        "wage_period": "monthly",
        "location": "Hubballi",
        "zone": "Zone 2",
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == ComparisonStatus.RATE_NOT_VERIFIED.value
    assert data["shortfall_indicated"] is False
    assert data["verified_record"] is None


def test_compare_unverified_schedules_return_rate_not_verified():
    """Verify that roles in unverified schedules return rate_not_verified and NEVER fall back to demo rates."""
    unverified_queries = [
        {"job_category": "cultivation_worker", "zone": "All Zones"},  # agriculture
        {"job_category": "mini_cement_worker", "zone": "Zone 1"},     # cement
        {"job_category": "fish_cutter", "zone": "All Zones"},          # fishery
        {"job_category": "spinning_mill_worker", "zone": "Zone 1"},    # spinning mills
        {"job_category": "stone_breaker", "zone": "Zone 1"},          # stone breaking
    ]

    for q in unverified_queries:
        payload = {
            "job_category": q["job_category"],
            "reported_wage": 10000.0,
            "wage_period": "monthly",
            "zone": q.get("zone"),
            "location": "Bengaluru",
        }
        response = client.post("/api/compare", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == ComparisonStatus.RATE_NOT_VERIFIED.value, (
            f"Query for {q['job_category']} should be rate_not_verified, got {data['status']}"
        )
        assert data["shortfall_indicated"] is False
        assert data["verified_record"] is None
        assert data["applicable_minimum_wage"] is None
