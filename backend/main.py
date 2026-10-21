"""Namma Sambala - Backend Wage Verification API Service.

FastAPI service providing:
1. GET / - Service health check and verification dataset stats
2. POST /api/compare - Deterministic minimum wage verification and shortfall analysis
"""
import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import SERVICE_NAME, SERVICE_VERSION
from backend.schemas.request import CompareRequest
from backend.schemas.response import (
    CompareResponse,
    ComparisonStatus,
    HealthCheckResponse,
)
from backend.wage.comparator import compare_wage
from backend.wage.repository import wage_repo

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("namma_sambala_api")

app = FastAPI(
    title=SERVICE_NAME,
    version=SERVICE_VERSION,
    description=(
        "Namma Sambala Wage Verification Component. "
        "Evaluates worker-reported wages against authoritative Karnataka Minimum Wages Act "
        "notifications for Bengaluru (Zone 1 - BBMP) using pure deterministic logic."
    ),
)

# Enable CORS for frontend integration (Vibha's React UI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format Pydantic validation errors consistently for API clients."""
    errors = exc.errors()
    error_messages = [f"{e.get('loc', ['field'])[-1]}: {e.get('msg')}" for e in errors]
    detail_msg = "; ".join(error_messages)
    logger.warning(f"Validation error on {request.url.path}: {detail_msg}")

    return JSONResponse(
        status_code=422,
        content={
            "status": ComparisonStatus.INVALID_INPUT.value,
            "shortfall_indicated": False,
            "error": "Invalid request parameters",
            "details": detail_msg,
            "explanation_en": f"Invalid input parameters: {detail_msg}",
            "explanation_kn": "ನೀಡಿದ ವಿವರಗಳಲ್ಲಿ ದೋಷವಿದೆ. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಮಾಹಿತಿಯನ್ನು ನಮೂದಿಸಿ.",
            "disclaimer": "This service checks statutory wage rates for Karnataka Zone 1.",
        },
    )


@app.get("/", response_model=HealthCheckResponse, tags=["Health"])
def health_check() -> HealthCheckResponse:
    """Health check endpoint providing service status and active dataset verification count."""
    return HealthCheckResponse(
        status="ok",
        service=SERVICE_NAME,
        version=SERVICE_VERSION,
        verified_records_count=len(wage_repo.verified_records),
        jurisdiction=wage_repo.jurisdiction,
    )


@app.post("/api/compare", response_model=CompareResponse, tags=["Wage Verification"])
def compare_endpoint(payload: CompareRequest) -> CompareResponse:
    """Evaluate reported wage against authoritative Karnataka Minimum Wage dataset."""
    logger.info(
        f"Processing comparison request: job='{payload.job_category}', "
        f"wage={payload.reported_wage}, period='{payload.wage_period}', "
        f"zone='{payload.zone or payload.location}'"
    )
    result = compare_wage(payload, repository=wage_repo)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
