# Master API Specification: Namma Sambala Backend

**Version:** 1.0.0  
**Coordinated For:** 
- **Voice/Extraction Component** (Suprada)
- **Frontend / React UI Component** (Vibha)
- **Backend / Wage Verification Component** (Backend Lead)

---

## 1. Overview & Service Contract

The backend provides deterministic minimum wage verification for Bengaluru (Karnataka Zone 1 - BBMP).  
**LLM Policy:** The comparison is 100% deterministic in Python. LLMs do not calculate wage figures or decide legal rates.

### Base URLs & Health Check
- **Local Dev Server:** `http://127.0.0.1:8000`
- **Health Check Endpoint:** `GET /`
  - Returns service status, version, and the count of active verified records.

```json
// GET / Response:
{
  "status": "ok",
  "service": "Namma Sambala Wage Verification API",
  "version": "1.0.0",
  "verified_records_count": 9,
  "jurisdiction": "Karnataka, India"
}
```

---

## 2. Wage Verification Endpoint: `POST /api/compare`

### 2.1 Request Schema (`CompareRequest`)

| Field Name | Type | Required | Default | Description / Extraction Notes |
| :--- | :--- | :--- | :--- | :--- |
| `worker_id` | `string` | Optional | `null` | Fictional/demo worker ID (e.g., `"demo-worker-01"`). |
| `job_category` | `string` | **Required** | `null` | Extracted role: `"security_guard"`, `"salesman"`, `"helper"`, `"mason"`, `"domestic_worker"`, etc. |
| `reported_wage` | `number` | **Required** | `null` | Wage reported by worker (must be `> 0`). |
| `wage_period` | `string` | Optional | `"monthly"` | One of: `"monthly"`, `"daily"`, `"hourly"`. |
| `skill_classification` | `string` | Optional | `null` | `"unskilled"`, `"semi_skilled"`, `"skilled"`, `"highly_skilled"`. Optional if the job title implies skill. |
| `location` | `string` | Optional | `"Bengaluru"` | Reported city or area (e.g., `"Bengaluru"`, `"BBMP"`, `"Koramangala"`). |
| `zone` | `string` | Optional | `"Zone 1"` | Explicit wage zone if known (e.g., `"Zone 1"`). |
| `hours_per_day` | `number` | Conditional | `8.0` | **Mandatory** if `wage_period == "hourly"`. Shift length in hours. |
| `days_per_month` | `integer` | Optional | `26` | Paid working days per month (Karnataka standard is 26). |
| `preferred_language` | `string` | Optional | `"en"` | `"en"` (English) or `"kn"` (Kannada). Both translations are always returned in the response. |

---

### 2.2 Response Schema (`CompareResponse`)

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `status` | `string (Enum)` | One of: `shortfall_indicated`, `no_shortfall_indicated`, `more_details_needed`, `rate_not_verified`, `invalid_input`. |
| `shortfall_indicated` | `boolean` | `true` if worker is underpaid relative to the statutory minimum. |
| `shortfall_amount` | `number \| null` | Shortfall in INR for the comparison period (e.g. `5965.86`). `null` if no shortfall. |
| `shortfall_percentage` | `number \| null` | Shortfall percentage (e.g. `33.21`%). |
| `applicable_minimum_wage`| `number \| null` | Statutory minimum wage rate in INR for the comparison period. |
| `reported_wage_normalized`| `number \| null` | Worker's wage aligned to the comparison period. |
| `comparison_period` | `string \| null` | Period basis used: `"monthly"`, `"daily"`, or `"hourly"`. |
| `verified_record` | `object \| null` | Sourced legal record details (see schema below). |
| `calculation_details` | `object \| null` | Detailed math formula and conversion basis. |
| `explanation_en` | `string` | Human-readable English explanation with citations. |
| `explanation_kn` | `string` | Voice-ready Kannada explanation for audio readout & Kannada UI. |
| `missing_fields` | `array[string]` | Fields needed if `status == "more_details_needed"`. |
| `disclaimer` | `string` | Mandatory legal awareness disclaimer under Karnataka Minimum Wages Act. |
| `worker_id` | `string \| null` | Echoed demo worker identifier. |

---

## 3. Concrete Integration Examples

### Scenario A: Security Guard with Shortfall (Monthly)
**Request:**
```json
{
  "worker_id": "demo-worker-01",
  "job_category": "security_guard",
  "reported_wage": 12000.0,
  "wage_period": "monthly",
  "location": "Bengaluru"
}
```

**Response:**
```json
{
  "status": "shortfall_indicated",
  "shortfall_indicated": true,
  "shortfall_amount": 5965.86,
  "shortfall_percentage": 33.21,
  "applicable_minimum_wage": 17965.86,
  "reported_wage_normalized": 12000.0,
  "comparison_period": "monthly",
  "verified_record": {
    "record_id": "KA-MW-SEC-2024-Z1-SEMI",
    "schedule_name": "Security Agency / Private Security Guards",
    "matched_occupation": "security_guard",
    "skill_classification": "semi_skilled",
    "applicable_zone": "Zone 1",
    "effective_from": "2024-04-01",
    "effective_to": "2025-03-31",
    "basic_wage_monthly": 15742.26,
    "vda_monthly": 2223.60,
    "total_minimum_wage_monthly": 17965.86,
    "total_minimum_wage_daily": 690.99,
    "statutory_hours_per_day": 8,
    "working_days_per_month_basis": 26,
    "legal_authority": "Government of Karnataka, Department of Labour",
    "notification_number": "Notification No. KAE 34 LWA 2022 (VDA Circular 2024-2025)",
    "source_url": "https://labour.karnataka.gov.in/",
    "verification_notes": "Minimum wages for unarmed security guards under Karnataka Private Security Agency schedule for Zone 1 (BBMP). Monthly minimum is based on 26 paid working days."
  },
  "calculation_details": {
    "comparison_period": "monthly",
    "reported_wage_input": 12000.0,
    "reported_wage_normalized": 12000.0,
    "applicable_statutory_wage": 17965.86,
    "hours_per_day_used": 8.0,
    "working_days_factor_used": 26,
    "calculation_basis": "Direct monthly comparison against Karnataka statutory monthly minimum wage (based on 26 working days)."
  },
  "explanation_en": "Under Government of Karnataka, Department of Labour (Notification No. KAE 34 LWA 2022 (VDA Circular 2024-2025)) for Zone 1 (Security Agency / Private Security Guards - Semi Skilled), the statutory minimum wage is ₹17,965.86 per monthly (Basic ₹15,742.26 + VDA ₹2,223.60 monthly equivalent). Your normalized wage of ₹12,000.00 indicates a shortfall of ₹5,965.86 per monthly (33.2% below legal minimum rate).",
  "explanation_kn": "ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ ಅಧಿಸೂಚನೆ (Notification No. KAE 34 LWA 2022 (VDA Circular 2024-2025)) ಪ್ರಕಾರ, Zone 1 (ಬಿಬಿಎಂಪಿ ಬೆಂಗಳೂರು) ವ್ಯಾಪ್ತಿಯಲ್ಲಿ Security Agency / Private Security Guards - ಅರೆ-ಕುಶಲ ವರ್ಗಕ್ಕೆ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ಪ್ರತಿ ತಿಂಗಳಿಗೆ ₹17,965.86. ನೀವು ತಿಳಿಸಿದ ವೇತನ ₹12,000.00 ಆಗಿದ್ದು, ಇದು ಕಾನೂನುಬದ್ಧ ಕನಿಷ್ಠ ವೇತನಕ್ಕಿಂತ ₹5,965.86 ಕಡಿಮೆಯಾಗಿದೆ (33.2% ಕೊರತೆ).",
  "missing_fields": [],
  "disclaimer": "This wage verification is provided for informational and wage awareness purposes under the Karnataka Minimum Wages Act, 1948 notifications and does not constitute formal legal counsel. Actual entitlements may vary based on overtime, specialized allowances, and formal employment contracts.",
  "worker_id": "demo-worker-01"
}
```

---

### Scenario B: Hourly Wage Missing Daily Working Hours
**Request:**
```json
{
  "job_category": "domestic_worker",
  "reported_wage": 60.0,
  "wage_period": "hourly",
  "location": "Bengaluru"
}
```

**Response:**
```json
{
  "status": "more_details_needed",
  "shortfall_indicated": false,
  "shortfall_amount": null,
  "shortfall_percentage": null,
  "missing_fields": ["hours_per_day"],
  "explanation_en": "Cannot compute legally justified comparison: Conversion failed: Hourly wage cannot be evaluated without confirmed daily working hours. Please provide working hours per day for hourly wage rates.",
  "explanation_kn": "ಕಾನೂನುಬದ್ಧ ಹೋಲಿಕೆಯನ್ನು ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ: ಗಂಟೆಯ ವೇತನಕ್ಕಾಗಿ ದಯವಿಟ್ಟು ದಿನದ ಕೆಲಸದ ಅವಧಿಯನ್ನು (ಗಂಟೆಗಳು) ತಿಳಿಸಿ."
}
```

---

### Scenario C: Ambiguous General Skill Category
**Request:**
```json
{
  "job_category": "commercial_worker",
  "reported_wage": 14000.0,
  "wage_period": "monthly"
}
```

**Response:**
```json
{
  "status": "more_details_needed",
  "shortfall_indicated": false,
  "missing_fields": ["skill_classification"],
  "explanation_en": "The job category 'commercial_worker' has multiple skill classifications (e.g., unskilled, semi-skilled, skilled) with different statutory wage rates. Please specify your skill level or exact job role.",
  "explanation_kn": "'commercial_worker' ಉದ್ಯೋಗ ವರ್ಗವು ವಿವಿಧ ಕೌಶಲ್ಯ ಮಟ್ಟಗಳನ್ನು ಹೊಂದಿದೆ (ಉದಾ: ಅಕುಶಲ, ಅರೆ-ಕುಶಲ, ಕುಶಲ). ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಿರ್ದಿಷ್ಟ ಕೌಶಲ್ಯ ಮಟ್ಟವನ್ನು ಅಥವಾ ಪಾತ್ರವನ್ನು ತಿಳಿಸಿ."
}
```

---

### Scenario D: Unverified Job Category (Strict Data Safety)
**Request:**
```json
{
  "job_category": "airline_pilot",
  "reported_wage": 150000.0
}
```

**Response:**
```json
{
  "status": "rate_not_verified",
  "shortfall_indicated": false,
  "explanation_en": "No verified statutory minimum wage record was found for job category 'airline_pilot'. To prevent misleading comparisons, unverified or unmapped occupations are not evaluated.",
  "explanation_kn": "'airline_pilot' ಉದ್ಯೋಗಕ್ಕೆ ಯಾವುದೇ ಪರಿಶೀಲಿಸಿದ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ದಾಖಲೆ ಕಂಡುಬಂದಿಲ್ಲ. ತಪ್ಪಾದ ಹೋಲಿಕೆಗಳನ್ನು ತಡೆಯಲು, ಪರಿಶೀಲಿಸದ ಉದ್ಯೋಗಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಲಾಗುವುದಿಲ್ಲ."
}
```

---

## 4. Coordination Notes for Suprada & Vibha
1. **For Suprada (Voice/Extraction):**
   - Extract `job_category`, `reported_wage`, and `wage_period`.
   - If the worker mentions working hourly or part-time, prompt for `hours_per_day`.
   - The Kannada explanation (`explanation_kn`) can be passed directly to TTS for natural Kannada voice response.
2. **For Vibha (React UI):**
   - Use `status` to render UI badges:
     - `shortfall_indicated` (Red/Amber alert badge with shortfall summary)
     - `no_shortfall_indicated` (Green badge with compliance confirmation)
     - `more_details_needed` (Prompt modal highlighting items in `missing_fields`)
     - `rate_not_verified` (Neutral informational state)
   - Display `verified_record` to give users full transparency on the official gazette notification, basic wage, and VDA components.
