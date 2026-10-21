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
