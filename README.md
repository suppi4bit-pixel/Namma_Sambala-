# Namma_Sambala- (ನಮ್ಮ ಸಂಬಳ)

Voice-first, Kannada-enabled AI platform for minimum wage awareness and compliance among Bengaluru workers.

---

## Backend & Wage Verification Architecture

This repository contains the deterministic backend service and statutory wage comparator for Namma Sambala.

### Core Engineering Principles
- **Separation of Concerns:** The backend exclusively manages statutory wage datasets, deterministic comparison arithmetic, and REST endpoints. AI transcription/extraction (Suprada) and React UI (Vibha) interface cleanly via the defined API contract.
- **Pure Deterministic Calculation:** All comparisons, daily/monthly/hourly normalizations, and shortfall percentages are executed in strict Python arithmetic. The LLM never invents wage figures or adjudicates legal compliance.
- **Verified vs Sourced Datasets:**
  - **Enabled for Comparison:** Only records with established statutory authority and verified applicability to Bengaluru (Zone 1 - BBMP) are enabled.
  - **Sourced but Unverified Schedules:** Schedules with unresolved legal applicability within BBMP limits (agriculture, fisheries, mini-cement, stone crushing, spinning mills) are preserved with full provenance but return `status: "rate_not_verified"` and never fall back to dummy/demo rates.
- **Provenance Transparency:** Every verified output links directly to its source gazette PDF, notification ID, gazette publication date, and annual VDA validity window.
- **Safe Fallbacks:** Comprehensive detection of ambiguous skill tiers, out-of-zone locations, missing working hours, and incompatible wage periods.

---

## Sourced Official Schedules

The official PDF gazettes in `backend/wage/sources/` correspond to package-relative datasets in `backend/wage/data/`:

| Schedule / Dataset | Notification Reference | Effective From | VDA Period | Status in BBMP (Zone 1) |
| :--- | :--- | :--- | :--- | :--- |
| **Safai Karmacharis / Cleaners (Private)** (`cleaner.json`) | No. KAE 105 LWA 2021 | 2022-07-28 | 2026-04-01 to 2027-03-31 | **Verified & Enabled** (₹22,282.90/mo; ₹857.07/day) |
| **Agriculture** (`agriculture.json`) | No. KAE 28 LWA 2016 | 2021-12-27 | 2026-04-01 to 2027-03-31 | Unverified (Unresolved BBMP jurisdiction) |
| **Fisheries** (`fishery.json`) | No. KAE 75 LWA 2015 | 2021-05-21 | 2026-04-01 to 2027-03-31 | Unverified (Statewide/coastal scope) |
| **Spinning Mills** (`spinningmills.json`) | No. KAE 05 LWA 2021 | 2022-02-15 | 2026-04-01 to 2027-03-31 | Unverified (Active BBMP presence unconfirmed) |
| **Mini Cement Plants** (`cement.json`) | No. KAE 03 LWA 2021 | 2021-07-09 | 2026-04-01 to 2027-03-31 | Unverified (Environmentally restricted in BBMP) |
| **Stone Breaking & Crushing** (`stonebreaking.json`) | No. KAE 135 LWA 2021 | 2022-06-18 | 2026-04-01 to 2027-03-31 | Unverified (Quarry zoning restrictions in BBMP) |

Additional verified schedules in `verified_wages_v1.json`:
- **Private Security Guards** (Zone 1 Semi-Skilled: ₹17,965.86/month)
- **Shops & Commercial Establishments** (Zone 1 Unskilled Helper: ₹15,106.23/month, ₹581.01/day)
- **Building & Construction Works** (Zone 1 Mazdoor: ₹16,350.80/month)
- **Domestic Workers** (Zone 1 Cleaner: ₹669.61/day, ₹83.70/hour)

---

## Quickstart & Setup

### 1. Prerequisites & Environment
- Python 3.11+
- Virtual environment:
```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Automated Tests
```bash
python -m pytest backend/tests -v
```

### 4. Run Development Server
```bash
uvicorn backend.main:app --reload --port 8000
```
- Health Check: `http://127.0.0.1:8000/`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

---

## API Summary

- `GET /` — Health check endpoint (`{"status": "healthy", "service": "Namma Sambala Wage Verification Engine"}`).
- `POST /api/compare` — Compare reported wage against statutory minimum wage schedules.

### Safe Response Statuses
- `shortfall_indicated`: Reported wage is below statutory minimum.
- `no_shortfall_indicated`: Reported wage meets or exceeds statutory minimum.
- `more_details_needed`: Missing required fields (e.g. `hours_per_day` for hourly wages or `skill_classification` for ambiguous roles).
- `rate_not_verified`: Occupation or location has no verified statutory rate.
- `invalid_input`: Negative wages, invalid period values, or malformed payloads.

---

## Documentation Links
- [Master API Contract](docs/api_contract.md) — Comprehensive schema specification for AI extraction (Suprada) and React UI (Vibha).
- [Wage Verification & Statutory Methodology Guide](docs/wage_verification_guide.md) — Detailed legal principles, verification workflow, and calculation rules.
