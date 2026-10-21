# Namma_Sambala- (ನಮ್ಮ ಸಂಬಳ)

Voice-first, Kannada-enabled AI platform for wage awareness among Bengaluru workers.

---

## Backend & Wage Verification Component

This repository houses the deterministic wage verification engine and backend service for Namma Sambala.

### Architecture Highlights
- **Framework:** FastAPI with strict Pydantic v2 validation.
- **Pure Deterministic Calculation:** The legal rate comparison and mathematical evaluations are computed strictly in Python. The LLM does not decide the statutory wage or calculate the shortfall.
- **Versioned & Verified Dataset:** Authoritative Karnataka Labour Department minimum wage schedules for Bengaluru (Zone 1 - BBMP) covering:
  - Private Security Agencies / Guards
  - Shops and Commercial Establishments
  - Building and Other Construction Works
  - Domestic Workers
- **Bilingual Output:** All comparisons return structured English and voice-ready Kannada explanations (`explanation_kn`).
- **Data Safety Guardrails:** Strict handling for unverified occupations, ambiguous skill categories, out-of-zone locations, and unconfirmed working hours.

---

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Automated Tests
```bash
python -m pytest backend/tests -v
```

### 3. Run the Backend API Server
```bash
uvicorn backend.main:app --reload --port 8000
```
- Health Check: `http://127.0.0.1:8000/`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

---

## Documentation
- [Master API Contract (for Suprada & Vibha)](docs/api_contract.md)
- [Wage Verification & Statutory Methodology Guide](docs/wage_verification_guide.md)
