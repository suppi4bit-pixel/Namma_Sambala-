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

// 7. Missing or ambiguous wage (never invent or substitute default)
{
  const res = extractDetailsFromText("I work as a security guard in Bengaluru");
  assert.strictEqual(res.reported_wage, "", "Missing wage must remain empty string");
  assert.strictEqual(res.job_category, "security_guard");
}

console.log('All 12 voiceExtractor regression test cases PASSED successfully!');
