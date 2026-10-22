import { getMockComparisonResponse } from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

/**
 * Check backend service connectivity and verified dataset count.
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        online: true,
        service: data.service,
        version: data.version,
        verified_records_count: data.verified_records_count,
        jurisdiction: data.jurisdiction
      };
    }
    return { online: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { online: false, error: err.message || 'Connection refused' };
  }
}

/**
 * Compare worker wage against statutory Karnataka Labour Dept dataset.
 * Adheres strictly to POST /api/compare contract.
 * 
 * @param {Object} payload 
 * @param {boolean} forceMockMode 
 */
export async function compareWage(payload, forceMockMode = false) {
  // If user explicitly enabled mock mode
  if (forceMockMode) {
    // Artificial small delay for realistic UX
    await new Promise(res => setTimeout(res, 400));
    const mockData = getMockComparisonResponse(payload);
    return {
      success: true,
      data: mockData,
      isMock: true,
      source: 'Mock Dataset (Client Demo)'
    };
  }

  // Attempt real API call to FastAPI backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const formattedPayload = {
      worker_id: payload.worker_id || 'web-worker-client',
      job_category: payload.job_category,
      reported_wage: parseFloat(payload.reported_wage),
      wage_period: payload.wage_period || 'monthly',
      skill_classification: payload.skill_classification || null,
      location: payload.location || 'Bengaluru',
      zone: payload.zone || 'Zone 1',
      hours_per_day: payload.hours_per_day ? parseFloat(payload.hours_per_day) : 8.0,
      days_per_month: payload.days_per_month ? parseInt(payload.days_per_month, 10) : 26,
      preferred_language: payload.preferred_language || 'kn'
    };

    const response = await fetch(`${BASE_URL}/api/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formattedPayload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        data,
        isMock: false,
        source: 'Live Verified FastAPI Backend'
      };
    } else if (response.status === 422) {
      // Pydantic validation error
      return {
        success: false,
        validationError: true,
        data,
        error: data.details || 'Validation error from wage engine'
      };
    } else {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('Backend call failed, checking fallback:', error);

    // Fallback to verified mock if enabled
    if (DEFAULT_MOCK_FALLBACK) {
      const mockData = getMockComparisonResponse(payload);
      return {
        success: true,
        data: mockData,
        isMock: true,
        fallbackTriggered: true,
        originalError: error.message,
        source: 'Mock Fallback (Backend Server Unreachable)'
      };
    }

    return {
      success: false,
      error: `Could not connect to backend server at ${BASE_URL}: ${error.message}`
    };
  }
}
