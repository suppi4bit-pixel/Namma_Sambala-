# Wage Verification & Statutory Methodology Guide: Namma Sambala

This document outlines the legal principles, authoritative sources, statutory calculation logic, and steps for adding newly verified wage records to **Namma Sambala**.

---

## 1. Legal Architecture & Authoritative Sources

### 1.1 The Minimum Wages Act, 1948 in Karnataka
Under Section 3 and Section 5 of the Minimum Wages Act, 1948, the Government of Karnataka (Department of Labour) periodically fixes and revises minimum wage rates for specified "Scheduled Employments".

Each notification specifies:
1. **Scheduled Employment:** e.g., *Private Security Agencies*, *Shops and Commercial Establishments*, *Building and Other Construction Works*, *Domestic Workers*.
2. **Skill Classifications:** Unskilled, Semi-Skilled, Skilled, Highly Skilled.
3. **Geographic Zones:**
   - **Zone 1:** Bruhat Bengaluru Mahanagara Palike (BBMP) and city corporation agglomeration areas.
   - **Zone 2:** City Municipalities and district centers.
   - **Zone 3 / 4:** Semi-urban, rural, and other areas.
4. **Wage Components:**
   - **Basic Wage:** Base statutory rate fixed by government gazette.
   - **Variable Dearness Allowance (VDA):** Cost-of-living index linked allowance revised annually (effective April 1 of each financial year).
   - **Total Statutory Minimum Wage = Basic Wage + VDA**.

### 1.2 Verified Sourced Schedules in Namma Sambala v1
| Schedule / Sector | Gazette Notification Reference | Zone | Typical Roles Verified |
| :--- | :--- | :--- | :--- |
| **Security Agencies** | Notification No. KAE 34 LWA 2022 / VDA 2024-25 | Zone 1 (BBMP) | Security Guard (Unarmed), Head Guard, Security Supervisor |
| **Shops & Commercial Establishments** | Notification No. KAE 20 LWA 2015 / VDA 2024-25 | Zone 1 (BBMP) | Helper, Peon, Cleaner, Bill Clerk, Salesman, Cashier |
| **Building & Construction Works** | Notification No. KAE 83 LWA 2022 / VDA 2024-25 | Zone 1 (BBMP) | Mazdoor / Labourer, Helper, Mason, Carpenter, Electrician |
| **Domestic Workers** | Karnataka Domestic Workers Minimum Wages Circular | Zone 1 (BBMP) | Cleaner, Sweeper, Utensil Washer, Cook, Nanny |

---

## 2. Calculation Assumptions & Conversion Rules

### 2.1 The 26-Day Statutory Basis
- Under Karnataka Minimum Wages Rules, the monthly wage is computed on the basis of **26 working days**.
- Every worker working 6 consecutive days is entitled to 1 day of paid weekly rest (Sunday/off day).
- **Daily Statutory Wage Formula:**  
  $$\text{Daily Statutory Wage} = \frac{\text{Monthly Total Statutory Wage}}{26}$$

### 2.2 Shift Duration & Hourly Conversion
- Standard statutory shift: **8 working hours per day** (excluding rest intervals), totaling 48 hours per week.
- **Hourly Statutory Wage Formula:**  
  $$\text{Hourly Statutory Wage} = \frac{\text{Daily Statutory Wage}}{8.0}$$
- **Critical Safety Guardrail:**  
  An hourly wage cannot be evaluated unless the worker confirms their actual daily hours. Part-time domestic workers often work 2-3 hours per day. Assuming an 8-hour shift for a part-time domestic worker would produce an illegal and completely inaccurate calculation. The backend strictly requires `hours_per_day` for hourly comparisons; otherwise, it returns `more_details_needed`.

---

## 3. How to Add a New Verified Wage Record

All wage records reside in:
`backend/wage/data/verified_wages_v1.json`

### Step 1: Verify the Primary Legal Document
1. Source the official notification or annual VDA circular from the Karnataka Labour Department website (`https://labour.karnataka.gov.in/`) or an official gazette.
2. Confirm the **Effective Dates** (e.g. `2024-04-01` to `2025-03-31`).
3. Extract the exact **Basic Wage** and **VDA** for **Zone 1**.

### Step 2: Format the Record Object
Each record must follow the schema defined in `backend/wage/data/wage_schema.json`:

```json
{
  "record_id": "KA-MW-GARMENT-2024-Z1-SEMI",
  "schedule_name": "Tailoring and Garment Manufacturing",
  "occupation_titles": [
    "tailor",
    "sewing_operator",
    "garment_worker",
    "ಟೈಲರ್"
  ],
  "skill_classification": "semi_skilled",
  "applicable_zone": "Zone 1",
  "zone_description": "Bruhat Bengaluru Mahanagara Palike (BBMP) limits",
  "effective_from": "2024-04-01",
  "effective_to": "2025-03-31",
  "wage_period": "monthly",
  "basic_wage_monthly": 12500.00,
  "vda_monthly": 2223.60,
  "total_minimum_wage_monthly": 14723.60,
  "total_minimum_wage_daily": 566.29,
  "statutory_hours_per_day": 8,
  "working_days_per_month_basis": 26,
  "legal_authority": "Government of Karnataka, Department of Labour",
  "notification_number": "Notification No. KAE XX LWA 2024",
  "source_url": "https://labour.karnataka.gov.in/",
  "verification_status": "verified",
  "verified_by": "Your Name / Legal Lead",
  "verification_date": "2024-10-21",
  "verification_notes": "Zone 1 rates for semi-skilled garment tailoring operators."
}
```

> **Data Safety Enforcement:**  
> Set `"verification_status": "verified"` only after primary-source cross-checking. Records marked `"draft"` or `"unverified"` are automatically excluded by `WageRepository` and will never be used in live comparisons.

### Step 3: Run Integrity & Compliance Tests
After adding or editing records, run:
```bash
python -m pytest backend/tests/test_dataset_integrity.py -v
```
This test will verify:
- All required fields are present.
- Basic Wage + VDA matches Total Monthly Wage.
- Total Daily Wage equals `Total Monthly / 26`.
- Source URLs are valid HTTP/HTTPS links.

---

## 4. Running the Backend & Tests

### Setup
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the test suite
python -m pytest backend/tests -v

# 3. Launch the development server
uvicorn backend.main:app --reload --port 8000
```

### Checking the Service
- **Interactive OpenAPI Documentation:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/`
