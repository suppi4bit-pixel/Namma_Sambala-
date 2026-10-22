# Wage Verification & Statutory Methodology Guide: Namma Sambala

This document outlines the legal principles, authoritative sources, statutory calculation logic, dataset governance, and steps for adding newly verified wage records to **Namma Sambala**.

---

## 1. Legal Architecture & Authoritative Sources

### 1.1 The Minimum Wages Act, 1948 in Karnataka
Under Section 3 and Section 5 of the Minimum Wages Act, 1948, the Government of Karnataka (Department of Labour) periodically fixes and revises minimum wage rates for specified "Scheduled Employments".

Each statutory gazette notification specifies:
1. **Scheduled Employment:** e.g., *Private Safai Karmacharis*, *Security Agencies*, *Shops and Commercial Establishments*, *Building and Other Construction Works*, *Domestic Workers*.
2. **Skill Classifications:** Unskilled, Semi-Skilled, Skilled, Highly Skilled (or unclassified where uniform statutory rates are mandated across all workers in the schedule).
3. **Geographic Zones:**
   - **Zone 1:** Bruhat Bengaluru Mahanagara Palike (BBMP) and city corporation agglomeration areas.
   - **Zone 2:** City Municipalities and other city corporations.
   - **Zone 3 / 4:** Town municipalities, semi-urban, rural, and other areas.
4. **Wage Components:**
   - **Basic Wage:** Base statutory rate fixed by government gazette.
   - **Variable Dearness Allowance (VDA):** Cost-of-living index linked allowance revised annually (effective April 1 of each financial year) based on the state average Consumer Price Index (CPI).
   - **Total Statutory Minimum Wage = Basic Wage + VDA**.
5. **Separate Dates of Provenance:**
   - **Notification Effective Date:** The date the parent schedule gazette notification was published and came into force (e.g. `2022-07-28`).
   - **VDA Effective Period:** The annual validity window of the consumer price index allowance (e.g. `2026-04-01` to `2027-03-31` calculated at 4 paise per point over base index points).

---

## 2. Status of Official Sourced Schedules

All 6 official PDF gazettes located in `backend/wage/sources/` have been audited, extracted, and structured into package-relative JSON datasets in `backend/wage/data/`:

| Schedule / Dataset | PDF Source & Gazette Reference | Notification Date | VDA Validity Period | Verification Status | Enabled for Live Comparison? | Legal Applicability & Scope Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Safai Karmacharis (Private)** (`cleaner.json`) | `cleaner.pdf`<br>Notification No. KAE 105 LWA 2021 | 2022-07-28 | 2026-04-01 to 2027-03-31 | **Zone 1 Verified**<br>(Zones 2, 3, 4 unverified) | **YES (Zone 1)** | Applies to private establishments in BBMP. **Exclusion:** Safai Karmacharis in Urban Local Bodies (ULBs) and Panchayats are governed by separate municipal rules. |
| **Agriculture** (`agriculture.json`) | `agriculture.pdf`<br>Notification No. KAE 28 LWA 2016 | 2021-12-27 | 2026-04-01 to 2027-03-31 | Unverified | NO (`rate_not_verified`) | Statewide unzoned schedule. Legal applicability within BBMP corporation boundary remains unresolved; agricultural land use within urban corporation is rare and disputed. |
| **Fisheries** (`fishery.json`) | `fishery.pdf`<br>Notification No. KAE 75 LWA 2015 | 2021-05-21 | 2026-04-01 to 2027-03-31 | Unverified | NO (`rate_not_verified`) | Coastal and statewide marine/inland fisheries. Applicability to urban Bengaluru retail fish markets vs aquaculture hatcheries requires legal determination. |
| **Spinning Mills** (`spinningmills.json`) | `spinningmills.pdf`<br>Notification No. KAE 05 LWA 2021 | 2022-02-15 | 2026-04-01 to 2027-03-31 | Unverified | NO (`rate_not_verified`) | Operates across 3 zones. Operating presence of spinning mills within BBMP Zone 1 vs peri-urban textile clusters (Doddaballapur, Ramanagara) requires active field confirmation. |
| **Mini Cement Plants** (`cement.json`) | `cement.pdf`<br>Notification No. KAE 03 LWA 2021 | 2021-07-09 | 2026-04-01 to 2027-03-31 | Unverified | NO (`rate_not_verified`) | Mini cement manufacturing is environmentally prohibited within BBMP limits; operations exist in rural/industrial corridors outside Zone 1. |
| **Stone Breaking & Crushing** (`stonebreaking.json`) | `stonebreaking.pdf`<br>Notification No. KAE 135 LWA 2021 | 2022-06-18 | 2026-04-01 to 2027-03-31 | Unverified | NO (`rate_not_verified`) | Stone quarrying and crushing are restricted by pollution control boards outside Bengaluru urban agglomeration. Zone 1 applicability is legally ambiguous. |

In addition, `backend/wage/data/verified_wages_v1.json` provides verified Zone 1 records for:
- **Private Security Agencies** (Notification No. KAE 34 LWA 2022)
- **Shops and Commercial Establishments** (Notification No. KAE 20 LWA 2015)
- **Building and Other Construction Works** (Notification No. KAE 83 LWA 2022)
- **Domestic Workers** (Karnataka Labour Department Domestic Workers Schedule)

---

## 3. Calculation Assumptions & Conversion Rules

### 3.1 The 26-Day Statutory Basis
- Under Karnataka Minimum Wages Rules, monthly wages are calculated on a **26 working days** basis.
- Workers completing 6 consecutive days are entitled to 1 day of paid weekly rest.
- **Daily Statutory Wage Formula:**
  $$\text{Daily Statutory Wage} = \frac{\text{Monthly Total Statutory Wage}}{26}$$

### 3.2 Standard Shift Duration & Hourly Conversion
- Standard statutory shift: **8 working hours per day** (excluding rest intervals), totaling 48 hours per week.
- **Hourly Statutory Wage Formula:**
  $$\text{Hourly Statutory Wage} = \frac{\text{Daily Statutory Wage}}{8.0}$$

### 3.3 Strict Mathematical Guardrails
1. **Never Guess Working Hours:**
   Part-time domestic and retail workers often work 2 to 4 hours per day. Assuming an 8-hour shift for part-time workers would distort the legal wage calculation. The backend strictly requires `hours_per_day` for hourly comparisons; otherwise, it returns `more_details_needed`.
2. **Never Convert Incompatible Wage Periods Without Required Data:**
   If a statutory schedule does not specify a monthly rate (or daily rate) and working days per month are unconfirmed, the comparator refuses ad-hoc conversion and returns `more_details_needed`.
3. **No Unverified Demo Fallback:**
   If a user requests a wage check for an occupation whose legal source or zone applicability is unverified, the engine returns `status: "rate_not_verified"` and `shortfall_indicated: false`. It **never** uses mock/demo fallback rates.
4. **Distinguish Shortfall from Legal Violation:**
   A mathematical shortfall against minimum wage schedules indicates a potential shortfall based on worker-reported information. It does not constitute a legally established court violation. All responses include mandatory legal disclaimers.

---

## 4. Verification Fields Specification

Every wage record in `backend/wage/data/*.json` adheres to `backend/wage/data/wage_schema.json`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `record_id` | `string` | Unique identifier (e.g. `KA-MW-CLEAN-2026-Z1`). |
| `schedule_name` | `string` | Full official Scheduled Employment title. |
| `occupation_titles` | `array[string]` | Normalized English and Kannada occupational titles. |
| `skill_classification` | `string \| null` | `unskilled`, `semi_skilled`, `skilled`, `highly_skilled`, or `null`. |
| `applicable_zone` | `string \| null` | E.g. `Zone 1` (BBMP), `Zone-II`, `All Zones`. |
| `zone_description` | `string \| null` | Geographic boundary explanation. |
| `notification_effective_date` | `string` | YYYY-MM-DD date parent notification came into force. |
| `vda_effective_from` | `string` | Start date of VDA validity window (e.g. `2026-04-01`). |
| `vda_effective_to` | `string` | End date of VDA validity window (e.g. `2027-03-31`). |
| `wage_period` | `string` | `monthly` or `daily`. |
| `basic_wage_monthly` | `number \| null` | Monthly basic component in INR. |
| `vda_monthly` | `number \| null` | Monthly VDA component in INR. |
| `basic_wage_daily` | `number \| null` | Daily basic component in INR. |
| `vda_daily` | `number \| null` | Daily VDA component in INR. |
| `total_minimum_wage_monthly`| `number \| null` | Total monthly statutory wage in INR. |
| `total_minimum_wage_daily`  | `number \| null` | Total daily statutory wage in INR. |
| `statutory_hours_per_day`   | `integer` | Standard shift length (default: 8). |
| `working_days_per_month_basis` | `integer` | Days per month basis (Karnataka: 26). |
| `qualifications` | `string \| null` | Educational or licensing requirements. |
| `exclusions` | `string \| null` | Statutory exclusions (e.g. ULBs, panchayats). |
| `legal_authority` | `string` | Issuing department / gazette authority. |
| `notification_number` | `string` | Gazette notification ID. |
| `source_url` | `string` | Department of Labour portal link. |
| `source_document` | `string` | PDF filename in `backend/wage/sources/`. |
| `page_number` | `integer` | Page in source PDF where rates appear. |
| `verification_status` | `string` | `verified` or `unverified`. |
| `verified_by` | `string \| null` | Verification lead or working group name. |
| `verification_date` | `string \| null` | Date verified (YYYY-MM-DD). |
| `verification_notes` | `string` | Methodology notes, CPI index details. |

---

## 5. How to Add a Verified Record

### Step 1: Source Primary Legal Documentation
1. Obtain the official notification or circular from the Karnataka Labour Department (`https://labour.karnataka.gov.in/`).
2. Verify:
   - Primary notification number and gazette publication date.
   - CPI base and current consumer price index points.
   - Exact Basic Wage and VDA numbers for Zone 1 (BBMP).
   - Any statutory exclusions or qualifications.

### Step 2: Add or Update JSON Record
Place the record in the relevant dataset file or `verified_wages_v1.json`. Follow verbatim numbers from the gazette:
- Set `"verification_status": "verified"`.
- Provide `"verified_by"` and `"verification_date"`.
- Set `"notification_effective_date"` separate from `"vda_effective_from"` / `"vda_effective_to"`.

### Step 3: Run Validation and Test Suite
```bash
python -m pytest backend/tests -v
```
All dataset integrity, arithmetic, and API tests must pass with 0 failures before opening a pull request.

---

## 6. Fictional API Examples

### Example 1: Safai Karmachari Zone 1 Shortfall Indicated
**Request:** `POST /api/compare`
```json
{
  "worker_id": "fictional-worker-101",
  "job_category": "safai_karmachari",
  "reported_wage": 18000.0,
  "wage_period": "monthly",
  "location": "Bengaluru",
  "zone": "Zone 1"
}
```
**Response (200 OK):**
```json
{
  "status": "shortfall_indicated",
  "shortfall_indicated": true,
  "shortfall_amount": 4282.9,
  "shortfall_percentage": 19.22,
  "applicable_minimum_wage": 22282.9,
  "comparison_period": "monthly",
  "missing_fields": [],
  "explanation_en": "Your reported monthly wage of ₹18,000.00 is ₹4,282.90 below the Karnataka statutory minimum wage of ₹22,282.90 for Safai Karmacharis / Cleaners (Private Establishments) in Zone 1 (Bruhat Bengaluru Mahanagara Palike (BBMP)).",
  "explanation_kn": "ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕನಿಷ್ಠ ವೇತನ ಅಧಿಸೂಚನೆಯ ಪ್ರಕಾರ ನಿಮ್ಮ ವೃತ್ತಿಗೆ (Safai Karmacharis / Cleaners (Private Establishments) - Zone 1) ನಿಗದಿತ ಕನಿಷ್ಠ ವೇತನ ₹22,282.90 ಆಗಿದೆ. ನಿಮಗೆ ಲಭಿಸುತ್ತಿರುವ ₹18,000.00 ವೇತನದಲ್ಲಿ ₹4,282.90 ವ್ಯತ್ಯಾಸ (ಕಡಿಮೆ) ಕಂಡುಬಂದಿದೆ.",
  "verified_record": {
    "record_id": "KA-MW-CLEAN-2026-Z1",
    "schedule_name": "Employment in Cleaning/Scavenging of Bathrooms, Toilets, Wash Rooms, Drainages etc as Private Safai Karmacharis",
    "matched_occupation": "safai_karmachari",
    "skill_classification": null,
    "applicable_zone": "Zone-I",
    "effective_from": "2026-04-01",
    "effective_to": "2027-03-31",
    "basic_wage_monthly": 19028.5,
    "vda_monthly": 3254.4,
    "basic_wage_daily": 731.9,
    "vda_daily": 125.17,
    "total_minimum_wage_monthly": 22282.9,
    "total_minimum_wage_daily": 857.07,
    "statutory_hours_per_day": 8,
    "working_days_per_month_basis": 26,
    "legal_authority": "Government of Karnataka, Department of Labour",
    "notification_number": "Notification No. KAE 105 LWA 2021 dated 28.07.2022",
    "notification_effective_date": "2022-07-28",
    "vda_effective_from": "2026-04-01",
    "vda_effective_to": "2027-03-31",
    "exclusions": "Excludes cleaning/scavenging works in Urban Local Bodies (ULBs) and Panchayath Raj Institutions; applies only to private Safai Karmacharis in private establishments.",
    "qualifications": null,
    "source_url": "https://labour.karnataka.gov.in/",
    "source_document": "cleaner.pdf",
    "verification_notes": "Verified rate for Zone 1 (BBMP). Notification No. KAE 105 LWA 2021 dated 28.07.2022..."
  },
  "calculation_detail": {
    "comparison_period": "monthly",
    "reported_wage_input": 18000.0,
    "reported_wage_normalized": 18000.0,
    "applicable_statutory_wage": 22282.9,
    "hours_per_day_used": 8.0,
    "working_days_factor_used": 26,
    "calculation_basis": "Direct monthly comparison against Zone 1 statutory minimum wage."
  },
  "disclaimer": "This automated comparison is for worker awareness under the Minimum Wages Act (Karnataka) and does not constitute a judicial ruling or legal enforcement notice."
}
```

### Example 2: Hourly Wage Missing Daily Hours
**Request:** `POST /api/compare`
```json
{
  "job_category": "domestic_worker",
  "reported_wage": 60.0,
  "wage_period": "hourly",
  "location": "Bengaluru"
}
```
**Response (200 OK):**
```json
{
  "status": "more_details_needed",
  "shortfall_indicated": false,
  "shortfall_amount": 0.0,
  "shortfall_percentage": 0.0,
  "applicable_minimum_wage": null,
  "comparison_period": "hourly",
  "missing_fields": ["hours_per_day"],
  "explanation_en": "Please provide daily working hours (hours_per_day) to accurately evaluate an hourly wage against Karnataka statutory standards.",
  "explanation_kn": "ಗಂಟೆಯ ಆಧಾರದ ವೇತನವನ್ನು ಲೆಕ್ಕಹಾಕಲು ನೀವು ದಿನಕ್ಕೆ ಎಷ್ಟು ಗಂಟೆ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ (hours_per_day) ಎಂಬುದನ್ನು ದಯವಿಟ್ಟು ತಿಳಿಸಿ.",
  "verified_record": null,
  "calculation_detail": null,
  "disclaimer": "This automated comparison is for worker awareness under the Minimum Wages Act (Karnataka)..."
}
```

### Example 3: Unverified Schedule (Rate Not Verified)
**Request:** `POST /api/compare`
```json
{
  "job_category": "cultivation_worker",
  "reported_wage": 9000.0,
  "wage_period": "monthly",
  "location": "Bengaluru",
  "zone": "All Zones"
}
```
**Response (200 OK):**
```json
{
  "status": "rate_not_verified",
  "shortfall_indicated": false,
  "shortfall_amount": 0.0,
  "shortfall_percentage": 0.0,
  "applicable_minimum_wage": null,
  "comparison_period": "monthly",
  "missing_fields": [],
  "explanation_en": "No verified statutory minimum wage record was found for 'cultivation_worker' in Bengaluru. Karnataka agricultural schedules remain unverified for urban corporation applicability.",
  "explanation_kn": "ಬೆಂಗಳೂರು ವ್ಯಾಪ್ತಿಯಲ್ಲಿ 'cultivation_worker' ವೃತ್ತಿಗೆ ಅಧಿಕೃತವಾಗಿ ಪರಿಶೀಲಿಸಲಾದ ಕನಿಷ್ಠ ವೇತನ ದರಗಳು ಲಭ್ಯವಿಲ್ಲ.",
  "verified_record": null,
  "calculation_detail": null,
  "disclaimer": "This automated comparison is for worker awareness under the Minimum Wages Act (Karnataka)..."
}
```

---

## 7. AI & Frontend Integration Requirements

### 7.1 Requirements for AI / Speech Teammate (Suprada)
1. **Field Extraction Target:**
   Extract the following strictly from voice/transcription:
   - `job_category`: Normalized job name (e.g. `safai_karmachari`, `security_guard`, `helper`, `mason`, `domestic_worker`).
   - `reported_wage`: Float > 0 (numeric earnings reported by worker).
   - `wage_period`: `"monthly"`, `"daily"`, or `"hourly"`.
   - `hours_per_day`: Float between 1.0 and 16.0 (mandatory if `wage_period == "hourly"`).
   - `days_per_month`: Optional integer (1 to 31).
   - `location` / `zone`: City / district string (default: `"Bengaluru"` / `"Zone 1"`).
2. **Do Not Synthesize Rates:**
   Do not allow the LLM to invent statutory wage rates or make compliance judgments. The LLM must pass structured parameters to `POST /api/compare`.
3. **Voice Response Synthesis:**
   When presenting the result back to the worker over voice/TTS, read `explanation_kn` directly, which has been phrased and verified for Kannada conversational clarity.

### 7.2 Requirements for Frontend Teammate (Vibha)
1. **Handle All 5 Response Statuses:**
   - `shortfall_indicated`: Render warning indicator, show `shortfall_amount` and `applicable_minimum_wage`, display `explanation_kn` and `explanation_en`.
   - `no_shortfall_indicated`: Render green checkmark indicator, show compliance confirmation.
   - `more_details_needed`: Check `missing_fields` (e.g. `hours_per_day`, `skill_classification`) and render prompt inputs asking the worker for the missing detail.
   - `rate_not_verified`: Inform the worker that statutory rates for this specific occupation/location are not currently verified.
   - `invalid_input`: Display validation guidance for invalid wage amounts or periods.
2. **Display Mandatory Legal Disclaimer:**
   Always display the `disclaimer` field at the bottom of the comparison card.
