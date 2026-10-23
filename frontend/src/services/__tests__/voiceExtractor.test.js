/**
 * Regression and unit test suite for voiceExtractor.js
 * Verifies:
 * - Decimal preservation (₹15,500.50)
 * - Indian number formatting (1,50,000, 15,000)
 * - Multilingual currency markers in Kannada, Hindi, and English
 * - Disambiguation between worker reported wage and statutory minimum wage
 * - Prevention of misreading hours or days as wage amount
 * - Preservation of empty string when wage is missing or ambiguous
 */
import assert from 'node:assert';
import { extractDetailsFromText } from '../voiceExtractor.js';

console.log('Running voiceExtractor regression tests...');

// 1. Decimal preservation
{
  const res = extractDetailsFromText("ನನಗೆ ₹15,500.50 ಬರುತ್ತದೆ");
  assert.strictEqual(res.reported_wage, "15500.50", "Decimal .50 must be preserved");
}

{
  const res = extractDetailsFromText("My daily wage is 650.75 rupees");
  assert.strictEqual(res.reported_wage, "650.75", "Decimal .75 must be preserved");
  assert.strictEqual(res.wage_period, "daily", "Wage period must be daily");
}

// 2. Indian comma formatting
{
  const res = extractDetailsFromText("I get 1,50,000 per month");
  assert.strictEqual(res.reported_wage, "150000", "Indian grouping 1,50,000 must parse to 150000");
}

{
  const res = extractDetailsFromText("₹15,000");
  assert.strictEqual(res.reported_wage, "15000", "15,000 must parse to 15000");
}

// 3. Currency markers in Kannada, Hindi, and English
{
  const res = extractDetailsFromText("मुझे 15,000 रुपये मिलते हैं");
  assert.strictEqual(res.reported_wage, "15000", "Hindi 15,000 रुपये must extract 15000");
}

{
  const res = extractDetailsFromText("ನನಗೆ 12,000 ರೂಪಾಯಿ ಸಿಗುತ್ತದೆ");
  assert.strictEqual(res.reported_wage, "12000", "Kannada 12,000 ರೂಪಾಯಿ must extract 12000");
}

{
  const res = extractDetailsFromText("I earn 15k monthly as a guard");
  assert.strictEqual(res.reported_wage, "15000", "15k must extract 15000");
}

// 4. Distinguishing reported wage from statutory minimum wage
{
  const res = extractDetailsFromText("ಕನಿಷ್ಠ ವೇತನ 17965 ಆದರೆ ನನಗೆ 12000 ಸಿಗುತ್ತೆ");
  assert.strictEqual(res.reported_wage, "12000", "Must extract worker's 12000, NOT statutory 17965");
}

{
  const res = extractDetailsFromText("न्यूनतम वेतन 17965 रुपये है लेकिन मुझे 12000 रुपये मिलते हैं");
  assert.strictEqual(res.reported_wage, "12000", "Must extract worker's 12000 in Hindi, NOT statutory 17965");
}

{
  const res = extractDetailsFromText("The statutory minimum wage is ₹17,965 but I only receive ₹12,000");
  assert.strictEqual(res.reported_wage, "12000", "Must extract worker's 12000 in English, NOT statutory 17965");
}

// 5. Isolating hours and days from wage amount
{
  const res = extractDetailsFromText("8 hours a day, 500 rupees");
  assert.strictEqual(res.hours_per_day, "8", "Hours per day must be 8");
  assert.strictEqual(res.reported_wage, "500", "Reported wage must be 500, not 8");
}

{
  const res = extractDetailsFromText("I work 26 days a month for 14000 salary");
  assert.strictEqual(res.days_per_month, "26", "Days per month must be 26");
  assert.strictEqual(res.reported_wage, "14000", "Reported wage must be 14000, not 26");
}

// 6. Hourly and daily periods
{
  const res = extractDetailsFromText("I make 80 per hour for 8 hrs");
  assert.strictEqual(res.wage_period, "hourly", "Period must be hourly");
  assert.strictEqual(res.reported_wage, "80", "Reported hourly wage must be 80");
}

// 8. Core Bug 1: Kannada ₹600 per day preservation
{
  const res = extractDetailsFromText("ನನಗೆ ದಿನಕ್ಕೆ 600 ರೂಪಾಯಿ ದಿನಗೂಲಿ ಸಿಗುತ್ತದೆ");
  assert.strictEqual(res.reported_wage, "600", "Kannada 600 per day must preserve reported_wage 600");
  assert.strictEqual(res.wage_period, "daily", "Kannada ದಿನಕ್ಕೆ must extract daily period");
}

// 9. Core Bug 2: Hindi ₹700 per month preservation
{
  const res = extractDetailsFromText("मुझे हर महीने 700 रुपये मिलते हैं");
  assert.strictEqual(res.reported_wage, "700", "Hindi 700 per month must preserve reported_wage 700");
  assert.strictEqual(res.wage_period, "monthly", "Hindi हर महीने must extract monthly period");
  assert.notStrictEqual(res.reported_wage, "12000", "Never replace 700 with assumed 12000");
}

// 10. English wage and pay-period preservation
{
  const res1 = extractDetailsFromText("I earn 600 per day as helper");
  assert.strictEqual(res1.reported_wage, "600", "English 600 per day must extract 600");
  assert.strictEqual(res1.wage_period, "daily", "English per day must extract daily period");

  const res2 = extractDetailsFromText("My salary is 700/month");
  assert.strictEqual(res2.reported_wage, "700", "English 700/month must extract 700");
  assert.strictEqual(res2.wage_period, "monthly", "English /month must extract monthly period");

  const res3 = extractDetailsFromText("I receive 600/day");
  assert.strictEqual(res3.reported_wage, "600", "English 600/day must extract 600");
  assert.strictEqual(res3.wage_period, "daily", "English /day must extract daily period");
}

// 11. Missing or ambiguous pay period triggers confirmation_required
{
  const res = extractDetailsFromText("ನನಗೆ 600 ರೂಪಾಯಿ ಸಿಗುತ್ತದೆ");
  assert.strictEqual(res.reported_wage, "600", "Reported wage 600 extracted");
  assert.strictEqual(res.wage_period, "", "Period must be empty when not stated (never default to monthly)");
  assert.strictEqual(res.confirmation_required, true, "confirmation_required must be true when period is missing");
  assert.ok(res.missing_or_uncertain_fields.includes("wage_period"), "wage_period must be in missing_or_uncertain_fields");
}

// 12. Mock response deterministic calculation: Kannada ₹600/day with 26 days
import { getMockComparisonResponse } from '../mockData.js';
{
  const mockRes = getMockComparisonResponse({
    job_category: "helper",
    reported_wage: "600",
    wage_period: "daily",
    days_per_month: 26
  });
  assert.strictEqual(mockRes.reported_wage, 600, "Mock must preserve original reported_wage of 600");
  assert.strictEqual(mockRes.reported_wage_period, "daily", "Mock must preserve reported_wage_period as daily");
  assert.strictEqual(mockRes.reported_wage_normalized, 15600, "Mock must calculate monthly equivalent of 15,600 (600 * 26)");
  assert.strictEqual(mockRes.comparison_period, "monthly", "Mock comparison period must be monthly");
  assert.ok(mockRes.explanation_kn.includes("600"), "Kannada explanation must mention original reported 600");
  assert.ok(mockRes.explanation_kn.includes("15,600"), "Kannada explanation must mention calculated equivalent 15,600");
  assert.strictEqual(mockRes._is_mock, true, "Must flag _is_mock as true");
}

// 13. Mock response deterministic calculation: Hindi ₹700/month NEVER overridden with 12000
{
  const mockRes = getMockComparisonResponse({
    job_category: "security_guard",
    reported_wage: "700",
    wage_period: "monthly"
  });
  assert.strictEqual(mockRes.reported_wage, 700, "Mock must preserve reported_wage 700");
  assert.strictEqual(mockRes.reported_wage_period, "monthly", "Mock must preserve reported_wage_period monthly");
  assert.strictEqual(mockRes.reported_wage_normalized, 700, "Normalized wage must be 700 (never 12,000)");
  assert.notStrictEqual(mockRes.reported_wage_normalized, 12000, "Never replace 700 with 12000");
  assert.ok(mockRes.shortfall_amount > 17000, "Shortfall against ₹17,965.86 must be > ₹17,000");
  assert.ok(mockRes.explanation_hi.includes("700"), "Hindi explanation must mention ₹700");
  assert.ok(!mockRes.explanation_hi.includes("12,000"), "Hindi explanation must not contain ₹12,000");
}

// 14. Compound sentence with days: Hindi 700/month with 26 working days
{
  const res = extractDetailsFromText("मुझे हर महीने 700 रुपये मिलते हैं और मैं 26 दिन काम करता हूँ");
  assert.strictEqual(res.reported_wage, "700", "Must extract 700 reported wage");
  assert.strictEqual(res.wage_period, "monthly", "Must extract monthly, not daily from '26 दिन'");
  assert.strictEqual(res.days_per_month, "26", "Must extract 26 working days per month");
}

// 15. Hourly wage safety: Mock never assumes 8 hours when unstated
{
  const mockRes = getMockComparisonResponse({
    job_category: "domestic_cook",
    reported_wage: "150",
    wage_period: "hourly",
    hours_per_day: null
  });
  assert.strictEqual(mockRes.status, "more_details_needed", "Hourly without confirmed hours must require more details");
  assert.ok(mockRes.missing_fields.includes("hours_per_day"), "Must flag hours_per_day in missing fields");
  assert.strictEqual(mockRes.shortfall_indicated, false, "Must not claim shortfall without hours");
}

// 16. Unverified zone safety: Never claim legal compliance for unverified zone
{
  const mockRes = getMockComparisonResponse({
    job_category: "security_guard",
    reported_wage: "20000",
    wage_period: "monthly",
    zone: "Zone 3"
  });
  assert.strictEqual(mockRes.status, "rate_not_verified", "Unverified zone must return rate_not_verified");
  assert.strictEqual(mockRes.shortfall_indicated, false, "Must not claim compliance or shortfall");
  assert.strictEqual(mockRes.applicable_minimum_wage, null, "Must not invent benchmark for unverified zone");
}

console.log('All voiceExtractor and mock regression test cases PASSED successfully!');
