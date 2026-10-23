"""Dataset integrity and compliance tests for all official wage datasets."""
import json
from pathlib import Path
import pytest
from backend.config import WAGE_DATASET_PATH

DATA_DIR = WAGE_DATASET_PATH.parent
OFFICIAL_FILES = [
    "cleaner.json",
    "agriculture.json",
    "fishery.json",
    "spinningmills.json",
    "cement.json",
    "stonebreaking.json",
]


def test_wage_dataset_file_exists():
    """Verify primary dataset JSON exists and is valid JSON."""
    assert WAGE_DATASET_PATH.exists()
    with open(WAGE_DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert "records" in data
    assert len(data["records"]) >= 5


def test_all_official_dataset_files_exist_and_parse():
    """Verify all 6 official datasets exist, parse cleanly, and contain records."""
    for filename in OFFICIAL_FILES:
        filepath = DATA_DIR / filename
        assert filepath.exists(), f"File {filename} does not exist"
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "records" in data, f"Key 'records' missing in {filename}"
        assert len(data["records"]) > 0, f"No records found in {filename}"


def test_unique_record_ids_across_all_datasets():
    """Ensure no duplicate record_ids exist across datasets."""
    all_record_ids = set()
    files_to_check = [WAGE_DATASET_PATH.name] + OFFICIAL_FILES

    for filename in files_to_check:
        filepath = DATA_DIR / filename
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        for record in data["records"]:
            rec_id = record["record_id"]
            assert rec_id not in all_record_ids, f"Duplicate record_id '{rec_id}' found in {filename}"
            all_record_ids.add(rec_id)


def test_verified_records_mathematical_consistency():
    """Verify that every verified record's components sum up correctly in verified_wages_v1.json."""
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


def test_official_datasets_provenance_and_math():
    """Verify provenance metadata and arithmetic for all 6 official datasets."""
    for filename in OFFICIAL_FILES:
        filepath = DATA_DIR / filename
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        for record in data["records"]:
            rec_id = record["record_id"]
            # Check provenance fields
            assert "source_document" in record, f"{rec_id} missing source_document"
            assert record["source_document"].endswith(".pdf"), f"{rec_id} source_document not PDF"
            notif_id = record.get("notification_number") or record.get("source_notification_id")
            assert notif_id is not None and len(notif_id) > 0, f"{rec_id} empty notification ID"
            assert "notification_effective_date" in record, f"{rec_id} missing notification_effective_date"
            assert "vda_effective_from" in record, f"{rec_id} missing vda_effective_from"
            assert "vda_effective_to" in record, f"{rec_id} missing vda_effective_to"
            assert record["vda_effective_from"] == "2026-04-01"
            assert record["vda_effective_to"] == "2027-03-31"

            # Check mathematical consistency when monthly components present
            basic_m = record.get("basic_wage_monthly")
            vda_m = record.get("vda_monthly")
            total_m = record.get("total_minimum_wage_monthly")
            if basic_m is not None and vda_m is not None and total_m is not None:
                assert total_m == pytest.approx(basic_m + vda_m, abs=0.05), (
                    f"Record {rec_id} monthly total {total_m} != {basic_m} + {vda_m}"
                )

            # Check mathematical consistency when daily components present
            basic_d = record.get("basic_wage_daily")
            vda_d = record.get("vda_daily")
            total_d = record.get("total_minimum_wage_daily")
            if basic_d is not None and vda_d is not None and total_d is not None:
                assert total_d == pytest.approx(basic_d + vda_d, abs=0.05), (
                    f"Record {rec_id} daily total {total_d} != {basic_d} + {vda_d}"
                )


def test_unverified_schedules_remain_unverified():
    """Verify that agriculture, cement, fishery, spinningmills, and stonebreaking are strictly unverified."""
    unverified_files = [
        "agriculture.json",
        "cement.json",
        "fishery.json",
        "spinningmills.json",
        "stonebreaking.json",
    ]
    for filename in unverified_files:
        filepath = DATA_DIR / filename
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        for record in data["records"]:
            rec_id = record["record_id"]
            assert record["verification_status"] == "unverified", (
                f"Record {rec_id} in {filename} must have verification_status 'unverified'"
            )
            assert record.get("verified_by") is None, f"{rec_id} in {filename} must have null verified_by"
            assert record.get("verification_date") is None, f"{rec_id} in {filename} must have null verification_date"


def test_cleaner_zone1_verified_others_unverified():
    """Verify that cleaner.json only has Zone 1 verified; Zones 2, 3, 4 remain unverified."""
    filepath = DATA_DIR / "cleaner.json"
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    zone1_found = False
    for record in data["records"]:
        zone = record.get("applicable_zone")
        if zone in ("Zone 1", "Zone-1", "Zone-I"):
            assert record["verification_status"] == "verified"
            assert record.get("verified_by") is not None
            assert record.get("verification_date") is not None
            zone1_found = True
        else:
            assert record["verification_status"] == "unverified"
            assert record.get("verified_by") is None
            assert record.get("verification_date") is None

    assert zone1_found, "cleaner.json missing verified Zone 1 record"
