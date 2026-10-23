"""Wage Record Repository and Authoritative Matcher.

Strictly enforces:
1. ONLY records with verification_status == "verified" are loaded for live comparisons.
2. Verified zone validation for Bengaluru (Zone 1 - BBMP).
3. Deterministic occupation and skill classification matching without guesswork.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.config import DATA_DIR, WAGE_DATASET_PATH

logger = logging.getLogger(__name__)

# Zone 1 aliases for Bengaluru
BENGALURU_ZONE1_IDENTIFIERS = {
    "bengaluru",
    "bangalore",
    "bbmp",
    "zone 1",
    "zone1",
    "zone i",
    "zone-1",
    "zone-i",
    "bruhat bengaluru mahanagara palike",
    "blr",
}

OFFICIAL_DATASET_FILES = [
    "verified_wages_v1.json",
    "cleaner.json",
    "cement.json",
    "agriculture.json",
    "fishery.json",
    "spinningmills.json",
    "stonebreaking.json",
]


def normalize_token(text: str | None) -> str:
    """Normalize string for consistent token matching."""
    if not text:
        return ""
    return text.lower().strip().replace("-", "_").replace(" ", "_")


class WageRepository:
    """In-memory index of verified Karnataka Minimum Wage records."""

    def __init__(self, dataset_path: Optional[Path] = None):
        self.custom_path: bool = dataset_path is not None
        self.dataset_path = dataset_path or WAGE_DATASET_PATH
        self.verified_records: List[Dict[str, Any]] = []
        self.unverified_records_count: int = 0
        self.jurisdiction: str = "Karnataka, India"
        self.version: str = "1.0.0"
        self._load_dataset()

    def _load_dataset(self) -> None:
        """Load and strictly filter verified wage records from JSON datasets."""
        self.verified_records = []
        self.unverified_records_count = 0

        target_paths = [self.dataset_path] if self.custom_path else [
            DATA_DIR / f for f in OFFICIAL_DATASET_FILES if (DATA_DIR / f).exists()
        ]

        seen_record_ids = set()
        for path in target_paths:
            if not path.exists():
                logger.warning(f"Wage dataset file not found at {path}")
                continue

            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if "jurisdiction" in data:
                self.jurisdiction = data.get("jurisdiction", self.jurisdiction)
            if "version" in data:
                self.version = data.get("version", self.version)

            all_records = data.get("records", [])
            for r in all_records:
                rec_id = r.get("record_id")
                if rec_id in seen_record_ids:
                    continue
                seen_record_ids.add(rec_id)

                # STRICT DATA SAFETY RULE: Keep unverified/draft records out of live comparisons!
                if r.get("verification_status") == "verified":
                    self.verified_records.append(r)
                else:
                    self.unverified_records_count += 1
                    logger.debug(
                        f"Excluded unverified record '{r.get('record_id')}' with status '{r.get('verification_status')}'"
                    )

        logger.info(
            f"Loaded {len(self.verified_records)} verified records from {len(target_paths)} datasets "
            f"(Excluded {self.unverified_records_count} unverified)"
        )

    def is_valid_bengaluru_zone(self, location: Optional[str], zone: Optional[str]) -> bool:
        """Verify if location or zone qualifies under Karnataka Zone 1 (BBMP)."""
        if zone:
            norm_zone = zone.lower().strip()
            if norm_zone in {"zone 1", "zone1", "zone i", "zone-1", "zone-i"}:
                return True
            if norm_zone in {
                "zone 2", "zone 3", "zone 4",
                "zone-2", "zone-3", "zone-4",
                "zone ii", "zone iii", "zone iv",
                "zone-ii", "zone-iii", "zone-iv",
                "zone2", "zone3", "zone4",
            }:
                return False

        if location:
            norm_loc = location.lower().strip()
            for idf in BENGALURU_ZONE1_IDENTIFIERS:
                if idf in norm_loc:
                    return True
            non_zone1_cities = {
                "mysuru", "mysore", "hubli", "dharwad", "mangaluru", "mangalore",
                "belagavi", "belgaum", "gulbarga", "kalaburagi", "ballari", "bellary",
                "udupi", "shimoga", "shivamogga", "davangere", "tumakuru", "tumkur"
            }
            for city in non_zone1_cities:
                if city in norm_loc:
                    return False

        # Default is Bengaluru Zone 1
        return True

    def find_matching_record(
        self,
        job_category: str,
        skill_classification: Optional[str] = None,
        location: Optional[str] = "Bengaluru",
        zone: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], str, Optional[str]]:
        """Deterministically match an authoritative verified wage record.

        Returns:
            (record, match_status, matched_title)
            where match_status is one of:
            - 'matched': Exactly one verified record resolved
            - 'unmatched_occupation': Occupation not found in verified dataset
            - 'ambiguous_skill': Occupation maps to multiple skill levels and user did not specify
            - 'unverified_zone': Location/zone is not covered under verified Zone 1 dataset
        """
        # 1. Zone Verification
        if not self.is_valid_bengaluru_zone(location, zone):
            return None, "unverified_zone", None

        norm_job = normalize_token(job_category)
        norm_skill = normalize_token(skill_classification) if skill_classification else None

        # Check for ambiguous general roles that span multiple skills without explicit skill
        ambiguous_general_roles = {
            "commercial_worker": ["unskilled", "semi_skilled", "skilled"],
            "construction": ["unskilled", "skilled"],
            "shop_worker": ["unskilled", "semi_skilled", "skilled"],
            "retail_worker": ["semi_skilled", "skilled"],
        }
        if norm_job in ambiguous_general_roles and not norm_skill:
            return None, "ambiguous_skill", None

        # 2. Search verified records
        candidate_matches: List[Tuple[Dict[str, Any], str]] = []

        for record in self.verified_records:
            titles = [normalize_token(t) for t in record.get("occupation_titles", [])]
            matched_title = None

            # Exact title match
            for t in titles:
                if norm_job == t:
                    matched_title = t
                    break

            # Substring / partial match if no exact match (e.g. 'security guard' vs 'guard')
            if not matched_title:
                for t in titles:
                    if norm_job in t or t in norm_job:
                        matched_title = t
                        break

            if matched_title:
                # Skill classification check if requested
                record_skill = normalize_token(record.get("skill_classification", ""))
                if norm_skill:
                    if norm_skill == record_skill:
                        candidate_matches.append((record, matched_title))
                else:
                    candidate_matches.append((record, matched_title))

        if not candidate_matches:
            return None, "unmatched_occupation", None

        if len(candidate_matches) == 1:
            return candidate_matches[0][0], "matched", candidate_matches[0][1]

        # If multiple records match because skill was not specified
        skills = {r.get("skill_classification") for r, _ in candidate_matches}
        if len(skills) > 1 and not norm_skill:
            return None, "ambiguous_skill", None

        # Return the best match
        return candidate_matches[0][0], "matched", candidate_matches[0][1]


# Singleton instance
wage_repo = WageRepository()
