"""Dataset integrity and compliance tests for verified_wages_v1.json."""
import json
import pytest
from backend.config import WAGE_DATASET_PATH


def test_wage_dataset_file_exists():
    """Verify dataset JSON exists and is valid JSON."""
    assert WAGE_DATASET_PATH.exists()
    with open(WAGE_DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert "records" in data
    assert len(data["records"]) >= 5


def test_verified_records_mathematical_consistency():
    """Verify that every verified record's components sum up correctly."""
    with open(WAGE_DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    for record in data["records"]:
        rec_id = record["record_id"]
        status = record["verification_status"]

        # Check required fields
        assert "record_id" in record
        assert "schedule_name" in record
        assert "occupation_titles" in record
        assert len(record["occupation_titles"]) > 0
        assert "skill_classification" in record
        assert "applicable_zone" in record
        assert "source_url" in record
        assert record["source_url"].startswith("http")

        if status == "verified":
            basic = record["basic_wage_monthly"]
            vda = record["vda_monthly"]
            total_monthly = record["total_minimum_wage_monthly"]
            total_daily = record["total_minimum_wage_daily"]

            # basic + vda == total_monthly (within 0.05 rounding error)
            assert total_monthly == pytest.approx(basic + vda, abs=0.05), (
                f"Record {rec_id} monthly total mismatch"
            )

            # daily == total_monthly / 26
            expected_daily = round(total_monthly / 26.0, 2)
            assert total_daily == pytest.approx(expected_daily, abs=0.05), (
                f"Record {rec_id} daily rate mismatch with 26-day basis"
            )
