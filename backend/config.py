"""Configuration settings for Namma Sambala backend service."""
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "wage" / "data"
WAGE_DATASET_PATH = DATA_DIR / "verified_wages_v1.json"
WAGE_SCHEMA_PATH = DATA_DIR / "wage_schema.json"

# Operational Defaults
DEFAULT_JURISDICTION = "Karnataka, India"
DEFAULT_ZONE = "Zone 1"
DEFAULT_HOURS_PER_DAY = 8.0
DEFAULT_WORKING_DAYS_MONTH = 26

# Service Metadata
SERVICE_NAME = "Namma Sambala Wage Verification API"
SERVICE_VERSION = "1.0.0"
API_PREFIX = "/api"

# Gemini AI Extraction Configuration
import os
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR.parent / ".env")
    load_dotenv()
except ImportError:
    pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
