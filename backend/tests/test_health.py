"""Tests for health check endpoint GET /."""
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify health check returns status ok, service metadata, and record count."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Namma Sambala" in data["service"]
    assert data["version"] == "1.0.0"
    assert data["verified_records_count"] > 0
    assert "Karnataka" in data["jurisdiction"]
