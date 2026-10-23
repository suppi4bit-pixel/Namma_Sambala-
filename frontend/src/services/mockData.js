/**
 * Verified mock responses adhering strictly to docs/api_contract.md
 * and backend/wage/data/verified_wages_v1.json.
 * 
 * NOTE: These mock responses are strictly separated from live backend responses
 * and are used only when the backend server is offline or when the user explicitly
 * enables mock mode. All calculations reflect verified Karnataka Labour Dept schedules.
 */

export const MOCK_RESPONSES = {
  // Scenario 1: Security guard in Bengaluru earning ₹12,000/mo (Shortfall)
  security_guard_shortfall: {
    status: "shortfall_indicated",
    shortfall_indicated: true,
    shortfall_amount: 5965.86,
    shortfall_percentage: 33.21,
    applicable_minimum_wage: 17965.86,
    reported_wage_normalized: 12000.0,
    comparison_period: "monthly",
    verified_record: {
      record_id: "KA-MW-SEC-2024-Z1-SEMI",
      schedule_name: "Security Agency / Private Security Guards",
      matched_occupation: "security_guard",
      skill_classification: "semi_skilled",
      applicable_zone: "Zone 1",
      effective_from: "2024-04-01",
      effective_to: "2025-03-31",
      basic_wage_monthly: 15742.26,
      vda_monthly: 2223.60,
      total_minimum_wage_monthly: 17965.86,
      total_minimum_wage_daily: 690.99,
      statutory_hours_per_day: 8,
      working_days_per_month_basis: 26,
      legal_authority: "Government of Karnataka, Department of Labour",
      notification_number: "Notification No. KAE 34 LWA 2022 (VDA Circular 2024-2025)",
      source_url: "https://labour.karnataka.gov.in/",
      verification_notes: "Minimum wages for unarmed security guards under Karnataka Private Security Agency schedule for Zone 1 (BBMP). Monthly minimum is based on 26 paid working days."
    },
    calculation_details: {
      comparison_period: "monthly",
      reported_wage_input: 12000.0,
      reported_wage_normalized: 12000.0,
      applicable_statutory_wage: 17965.86,
      hours_per_day_used: 8.0,
      working_days_factor_used: 26,
      calculation_basis: "Direct monthly comparison against Karnataka statutory monthly minimum wage (based on 26 working days)."
    },
    explanation_en: "Under Government of Karnataka, Department of Labour (Notification No. KAE 34 LWA 2022 (VDA Circular 2024-2025)) for Zone 1 (Security Agency / Private Security Guards - Semi Skilled), the statutory minimum wage is ₹17,965.86 per month (Basic ₹15,742.26 + VDA ₹2,223.60). Your normalized wage of ₹12,000.00 indicates a shortfall of ₹5,965.86 per month (33.2% below legal minimum rate).",
    explanation_kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ ಅಧಿಸೂಚನೆ (Notification No. KAE 34 LWA 2022 (VDA Circular 2024-2025)) ಪ್ರಕಾರ, Zone 1 (ಬಿಬಿಎಂಪಿ ಬೆಂಗಳೂರು) ವ್ಯಾಪ್ತಿಯಲ್ಲಿ Security Agency / Private Security Guards - ಅರೆ-ಕುಶಲ ವರ್ಗಕ್ಕೆ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ಪ್ರತಿ ತಿಂಗಳಿಗೆ ₹17,965.86. ನೀವು ತಿಳಿಸಿದ ವೇತನ ₹12,000.00 ಆಗಿದ್ದು, ಇದು ಕಾನೂನುಬದ್ಧ ಕನಿಷ್ಠ ವೇತನಕ್ಕಿಂತ ₹5,965.86 ಕಡಿಮೆಯಾಗಿದೆ (33.2% ಕೊರತೆ).",
    missing_fields: [],
    disclaimer: "This wage verification is provided for informational and wage awareness purposes under the Karnataka Minimum Wages Act, 1948 notifications and does not constitute formal legal counsel. Actual entitlements may vary based on overtime, specialized allowances, and formal employment contracts.",
    worker_id: "demo-worker-01",
    _is_mock: true
  },

  // Scenario 2: Security guard earning ₹18,500/mo (No shortfall)
  security_guard_compliant: {
    status: "no_shortfall_indicated",
    shortfall_indicated: false,
    shortfall_amount: 0.0,
    shortfall_percentage: 0.0,
    applicable_minimum_wage: 17965.86,
    reported_wage_normalized: 18500.0,
    comparison_period: "monthly",
    verified_record: {
      record_id: "KA-MW-SEC-2024-Z1-SEMI",
      schedule_name: "Security Agency / Private Security Guards",
      matched_occupation: "security_guard",
      skill_classification: "semi_skilled",
      applicable_zone: "Zone 1",
      effective_from: "2024-04-01",
      effective_to: "2025-03-31",
      basic_wage_monthly: 15742.26,
      vda_monthly: 2223.60,
      total_minimum_wage_monthly: 17965.86,
      total_minimum_wage_daily: 690.99,
      statutory_hours_per_day: 8,
      working_days_per_month_basis: 26,
      legal_authority: "Government of Karnataka, Department of Labour",
      notification_number: "Notification No. KAE 34 LWA 2022 (VDA Circular 2024-2025)",
      source_url: "https://labour.karnataka.gov.in/",
      verification_notes: "Minimum wages for unarmed security guards under Karnataka Private Security Agency schedule for Zone 1 (BBMP)."
    },
    calculation_details: {
      comparison_period: "monthly",
      reported_wage_input: 18500.0,
      reported_wage_normalized: 18500.0,
      applicable_statutory_wage: 17965.86,
      hours_per_day_used: 8.0,
      working_days_factor_used: 26,
      calculation_basis: "Direct monthly comparison against Karnataka statutory monthly minimum wage."
    },
    explanation_en: "Under Government of Karnataka, Department of Labour for Zone 1 (Security Agency - Semi Skilled), the statutory minimum wage is ₹17,965.86 per month. Your normalized wage of ₹18,500.00 meets or exceeds the applicable statutory rate.",
    explanation_kn: "ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ ನಿಯಮಾವಳಿಗಳ ಪ್ರಕಾರ, Zone 1 ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಸೆಕ್ಯುರಿಟಿ ಗಾರ್ಡ್ ಹುದ್ದೆಗೆ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ₹17,965.86. ನೀವು ತಿಳಿಸಿದ ವೇತನ ₹18,500.00 ಆಗಿದ್ದು, ಇದು ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನವನ್ನು ಪೂರೈಸುತ್ತದೆ.",
    missing_fields: [],
    disclaimer: "This wage verification is provided for informational and wage awareness purposes under the Karnataka Minimum Wages Act, 1948 notifications and does not constitute formal legal counsel.",
    worker_id: "demo-worker-02",
    _is_mock: true
  },

  // Scenario 3: Shop Helper earning ₹450 daily (Shortfall against ₹581.01 daily)
  helper_daily_shortfall: {
    status: "shortfall_indicated",
    shortfall_indicated: true,
    shortfall_amount: 131.01,
    shortfall_percentage: 22.55,
    applicable_minimum_wage: 581.01,
    reported_wage_normalized: 450.0,
    comparison_period: "daily",
    verified_record: {
      record_id: "KA-MW-SHOPS-2024-Z1-UNSKILLED",
      schedule_name: "Shops and Commercial Establishments",
      matched_occupation: "helper",
      skill_classification: "unskilled",
      applicable_zone: "Zone 1",
      effective_from: "2024-04-01",
      effective_to: "2025-03-31",
      basic_wage_monthly: 11587.83,
      vda_monthly: 3518.40,
      total_minimum_wage_monthly: 15106.23,
      total_minimum_wage_daily: 581.01,
      statutory_hours_per_day: 8,
      working_days_per_month_basis: 26,
      legal_authority: "Government of Karnataka, Department of Labour",
      notification_number: "Notification No. KAE 20 LWA 2015 (VDA Revision 2024-2025)",
      source_url: "https://labour.karnataka.gov.in/",
      verification_notes: "Covers un-skilled general helpers, peons, messengers, cleaners in retail shops, commercial offices, and establishments in BBMP limits."
    },
    calculation_details: {
      comparison_period: "daily",
      reported_wage_input: 450.0,
      reported_wage_normalized: 450.0,
      applicable_statutory_wage: 581.01,
      hours_per_day_used: 8.0,
      working_days_factor_used: 26,
      calculation_basis: "Daily statutory rate comparison (Monthly total ₹15,106.23 / 26 days)."
    },
    explanation_en: "Under Shops and Commercial Establishments schedule (Zone 1 - Unskilled Helper), statutory daily wage is ₹581.01. Your reported daily wage of ₹450.00 indicates a shortfall of ₹131.01 per day (22.5% below legal rate).",
    explanation_kn: "ಅಂಗಡಿಗಳು ಮತ್ತು ವಾಣಿಜ್ಯ ಸಂಸ್ಥೆಗಳ ಅಧಿಸೂಚನೆ (Zone 1 - ಅಕುಶಲ ಸಹಾಯಕ/ಹೆಲ್ಪರ್) ಪ್ರಕಾರ ಶಾಸನಬದ್ಧ ದೈನಂದಿನ ವೇತನ ₹581.01. ನೀವು ತಿಳಿಸಿದ ದಿನಗೂಲಿ ₹450.00 ಆಗಿದ್ದು, ಪ್ರತಿ ದಿನಕ್ಕೆ ₹131.01 ಕೊರತೆಯಿದೆ (22.5% ಕಡಿಮೆ).",
    missing_fields: [],
    disclaimer: "This wage verification is provided for informational and wage awareness purposes under the Karnataka Minimum Wages Act, 1948 notifications and does not constitute formal legal counsel.",
    _is_mock: true
  },

  // Scenario 4: Construction Mason earning ₹650 daily (Shortfall against ₹702.89)
  mason_daily_shortfall: {
    status: "shortfall_indicated",
    shortfall_indicated: true,
    shortfall_amount: 52.89,
    shortfall_percentage: 7.52,
    applicable_minimum_wage: 702.89,
    reported_wage_normalized: 650.0,
    comparison_period: "daily",
    verified_record: {
      record_id: "KA-MW-CONST-2024-Z1-SKILLED",
      schedule_name: "Building and Other Construction Works",
      matched_occupation: "mason",
      skill_classification: "skilled",
      applicable_zone: "Zone 1",
      effective_from: "2024-04-01",
      effective_to: "2025-03-31",
      basic_wage_monthly: 16479.91,
      vda_monthly: 1795.20,
      total_minimum_wage_monthly: 18275.11,
      total_minimum_wage_daily: 702.89,
      statutory_hours_per_day: 8,
      working_days_per_month_basis: 26,
      legal_authority: "Government of Karnataka, Department of Labour",
      notification_number: "Notification No. KAE 83 LWA 2022 (VDA Circular 2024-2025)",
      source_url: "https://labour.karnataka.gov.in/",
      verification_notes: "Skilled building artisans including masons, certified carpenters, plumbers, and electricians in Zone 1 BBMP."
    },
    calculation_details: {
      comparison_period: "daily",
      reported_wage_input: 650.0,
      reported_wage_normalized: 650.0,
      applicable_statutory_wage: 702.89,
      hours_per_day_used: 8.0,
      working_days_factor_used: 26,
      calculation_basis: "Daily statutory rate comparison based on 26 paid working days."
    },
    explanation_en: "Under Building and Construction Works schedule for Zone 1 (Skilled Mason), statutory daily wage is ₹702.89. Your reported daily wage of ₹650.00 indicates a shortfall of ₹52.89 per day (7.5% below legal rate).",
    explanation_kn: "ಕಟ್ಟಡ ಮತ್ತು ನಿರ್ಮಾಣ ಕಾಮಗಾರಿಗಳ ಅಧಿಸೂಚನೆ ಪ್ರಕಾರ Zone 1 ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಕುಶಲ ಮೇಸ್ತ್ರಿ (Mason) ಗೆ ಶಾಸನಬದ್ಧ ದಿನಗೂಲಿ ₹702.89. ನೀವು ತಿಳಿಸಿದ ದಿನಗೂಲಿ ₹650.00 ಆಗಿದ್ದು, ಪ್ರತಿ ದಿನಕ್ಕೆ ₹52.89 ಕೊರತೆಯಿದೆ.",
    missing_fields: [],
    disclaimer: "This wage verification is provided for informational and wage awareness purposes under the Karnataka Minimum Wages Act, 1948 notifications.",
    _is_mock: true
  },

  // Scenario 5: Domestic Cook earning ₹18,000/mo (No shortfall against ₹18,275.11 / or slight shortfall)
  domestic_cook: {
    status: "shortfall_indicated",
    shortfall_indicated: true,
    shortfall_amount: 275.11,
    shortfall_percentage: 1.51,
    applicable_minimum_wage: 18275.11,
    reported_wage_normalized: 18000.0,
    comparison_period: "monthly",
    verified_record: {
      record_id: "KA-MW-DOM-2024-Z1-SKILLED",
      schedule_name: "Domestic Workers",
      matched_occupation: "domestic_cook",
      skill_classification: "skilled",
      applicable_zone: "Zone 1",
      effective_from: "2024-04-01",
      effective_to: "2025-03-31",
      basic_wage_monthly: 16479.91,
      vda_monthly: 1795.20,
      total_minimum_wage_monthly: 18275.11,
      total_minimum_wage_daily: 702.89,
      statutory_hours_per_day: 8,
      working_days_per_month_basis: 26,
      legal_authority: "Government of Karnataka, Department of Labour",
      notification_number: "Karnataka Domestic Workers Minimum Wages Notification & VDA 2024-25",
      source_url: "https://labour.karnataka.gov.in/",
      verification_notes: "Covers skilled domestic roles like dedicated home cooks, certified nannies, and specialized elder caregivers."
    },
    calculation_details: {
      comparison_period: "monthly",
      reported_wage_input: 18000.0,
      reported_wage_normalized: 18000.0,
      applicable_statutory_wage: 18275.11,
      hours_per_day_used: 8.0,
      working_days_factor_used: 26,
      calculation_basis: "Monthly minimum wage comparison."
    },
    explanation_en: "Under Karnataka Domestic Workers schedule for Zone 1 (Skilled Cook), statutory minimum wage is ₹18,275.11 per month. Your normalized wage of ₹18,000.00 indicates a minor shortfall of ₹275.11 per month.",
    explanation_kn: "ಕರ್ನಾಟಕ ಗೃಹ ಕಾರ್ಮಿಕರ ಅಧಿಸೂಚನೆ ಪ್ರಕಾರ Zone 1 ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಕುಶಲ ಅಡುಗೆಯವರಿಗೆ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ₹18,275.11. ನೀವು ತಿಳಿಸಿದ ವೇತನ ₹18,000.00 ಆಗಿದ್ದು, ತಿಂಗಳಿಗೆ ₹275.11 ಕೊರತೆಯಿದೆ.",
    missing_fields: [],
    disclaimer: "This wage verification is provided for informational and wage awareness purposes under the Karnataka Minimum Wages Act, 1948 notifications.",
    _is_mock: true
  },

  // Scenario 6: Missing working hours for hourly wage
  hourly_missing_hours: {
    status: "more_details_needed",
    shortfall_indicated: false,
    shortfall_amount: null,
    shortfall_percentage: null,
    applicable_minimum_wage: null,
    reported_wage_normalized: null,
    comparison_period: "hourly",
    verified_record: null,
    calculation_details: null,
    missing_fields: ["hours_per_day"],
    explanation_en: "Cannot compute legally justified comparison: Conversion failed: Hourly wage cannot be evaluated without confirmed daily working hours. Please provide working hours per day for hourly wage rates.",
    explanation_kn: "ಕಾನೂನುಬದ್ಧ ಹೋಲಿಕೆಯನ್ನು ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ: ಗಂಟೆಯ ವೇತನಕ್ಕಾಗಿ ದಯವಿಟ್ಟು ದಿನದ ಕೆಲಸದ ಅವಧಿಯನ್ನು (ಗಂಟೆಗಳು) ತಿಳಿಸಿ.",
    disclaimer: "This wage verification is provided for informational and wage awareness purposes under the Karnataka Minimum Wages Act, 1948 notifications.",
    _is_mock: true
  },

  // Scenario 7: Unverified role
  unverified_role: {
    status: "rate_not_verified",
    shortfall_indicated: false,
    shortfall_amount: null,
    shortfall_percentage: null,
    applicable_minimum_wage: null,
    reported_wage_normalized: null,
    comparison_period: null,
    verified_record: null,
    calculation_details: null,
    missing_fields: [],
    explanation_en: "No verified statutory minimum wage record was found for this job category and zone. To prevent misleading comparisons, unverified or unmapped occupations are not evaluated.",
    explanation_kn: "ಈ ಉದ್ಯೋಗ ಅಥವಾ ವಲಯಕ್ಕೆ ಯಾವುದೇ ಪರಿಶೀಲಿಸಿದ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ದಾಖಲೆ ಕಂಡುಬಂದಿಲ್ಲ. ತಪ್ಪಾದ ಹೋಲಿಕೆಗಳನ್ನು ತಡೆಯಲು, ಪರಿಶೀಲಿಸದ ಉದ್ಯೋಗಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಲಾಗುವುದಿಲ್ಲ.",
    disclaimer: "This service checks statutory wage rates for Karnataka Zone 1 (BBMP).",
    _is_mock: true
  }
};

/**
 * Returns an appropriate mock response based on the request payload.
 * Deterministically computes normalized wage and shortfall from user input,
 * ensuring demo/mock mode never overrides the submitted wage.
 */
export function getMockComparisonResponse(payload) {
  const {
    job_category,
    reported_wage,
    wage_period = 'monthly',
    hours_per_day,
    days_per_month = 26,
    zone = 'Zone 1',
    worker_id = 'demo-worker'
  } = payload;
  const wage = parseFloat(reported_wage) || 0;

  // Check hourly without hours
  if (wage_period === "hourly" && (!hours_per_day || parseFloat(hours_per_day) <= 0)) {
    return {
      ...MOCK_RESPONSES.hourly_missing_hours,
      reported_wage: wage,
      reported_wage_period: wage_period,
      _is_mock: true
    };
  }

  // Check non-zone 1
  if (zone && zone !== "Zone 1") {
    return {
      ...MOCK_RESPONSES.unverified_role,
      reported_wage: wage,
      reported_wage_period: wage_period,
      _is_mock: true
    };
  }

  let selectedMock = MOCK_RESPONSES.security_guard_shortfall;
  if (job_category === "helper" || job_category === "shop_helper") {
    selectedMock = MOCK_RESPONSES.helper_daily_shortfall;
  } else if (job_category === "mason" || job_category === "carpenter") {
    selectedMock = MOCK_RESPONSES.mason_daily_shortfall;
  } else if (job_category === "domestic_cook" || job_category === "cook") {
    selectedMock = MOCK_RESPONSES.domestic_cook;
  }

  const verifiedRecord = selectedMock.verified_record;
  const statutoryMonthly = verifiedRecord.total_minimum_wage_monthly;
  const statutoryDaily = verifiedRecord.total_minimum_wage_daily;

  let comparisonPeriod = wage_period;
  let normalizedWage = wage;
  let applicableStatutory = statutoryMonthly;
  const hoursUsed = parseFloat(hours_per_day) || 8.0;
  const daysFactor = parseInt(days_per_month, 10) || 26;
  let calcBasis = "";

  if (wage_period === "daily") {
    if (daysFactor > 0) {
      comparisonPeriod = "monthly";
      normalizedWage = Math.round(wage * daysFactor * 100) / 100;
      applicableStatutory = statutoryMonthly;
      calcBasis = `Reported daily wage (₹${wage.toFixed(2)}) converted to monthly based on worker's reported ${daysFactor} working days/month.`;
    } else {
      comparisonPeriod = "daily";
      normalizedWage = wage;
      applicableStatutory = statutoryDaily;
      calcBasis = "Direct daily comparison against statutory daily minimum wage (monthly statutory rate / 26 days).";
    }
  } else if (wage_period === "hourly") {
    comparisonPeriod = "hourly";
    const statutoryHourly = Math.round((statutoryDaily / 8.0) * 100) / 100;
    normalizedWage = wage;
    applicableStatutory = statutoryHourly;
    calcBasis = `Hourly comparison against statutory hourly rate (₹${statutoryDaily.toFixed(2)}/8 hrs = ₹${statutoryHourly.toFixed(2)}/hr).`;
  } else {
    // Monthly
    comparisonPeriod = "monthly";
    normalizedWage = wage;
    applicableStatutory = statutoryMonthly;
    calcBasis = "Direct monthly comparison against Karnataka statutory monthly minimum wage (based on 26 working days).";
  }

  const difference = Math.round((applicableStatutory - normalizedWage) * 100) / 100;
  const isShortfall = difference > 0.05;
  const shortfallAmount = isShortfall ? difference : 0.0;
  const shortfallPct = isShortfall ? Math.round((difference / applicableStatutory) * 10000) / 100 : 0.0;
  const status = isShortfall ? "shortfall_indicated" : "no_shortfall_indicated";

  const periodEn = comparisonPeriod;
  const periodKn = comparisonPeriod === 'daily' ? 'ದಿನಕ್ಕೆ' : comparisonPeriod === 'hourly' ? 'ಗಂಟೆಗೆ' : 'ತಿಂಗಳಿಗೆ';
  const periodHi = comparisonPeriod === 'daily' ? 'प्रति दिन' : comparisonPeriod === 'hourly' ? 'प्रति घंटा' : 'प्रति माह';

  const workerPeriodEn = wage_period;
  const workerPeriodKn = wage_period === 'daily' ? 'ದಿನಕ್ಕೆ' : wage_period === 'hourly' ? 'ಗಂಟೆಗೆ' : 'ತಿಂಗಳಿಗೆ';
  const workerPeriodHi = wage_period === 'daily' ? 'प्रति दिन' : wage_period === 'hourly' ? 'प्रति घंटा' : 'प्रति माह';

  let repClauseEn = `Your reported wage of ₹${wage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per ${workerPeriodEn}`;
  let repClauseKn = `ನೀವು ತಿಳಿಸಿದ ವೇತನ ${workerPeriodKn} ₹${wage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  let repClauseHi = `आपका सूचित वेतन ${workerPeriodHi} ₹${wage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (wage_period !== comparisonPeriod) {
    repClauseEn += ` (calculated equivalent of ₹${normalizedWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per ${periodEn} based on ${daysFactor} working days)`;
    repClauseKn += ` (${daysFactor} ಕೆಲಸದ ದಿನಗಳ ಆಧಾರದ ಮೇಲೆ ಲೆಕ್ಕಹಾಕಿದ ಸಮಾನ ವೇತನ ${periodKn} ₹${normalizedWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    repClauseHi += ` (${daysFactor} कार्य दिवसों के आधार पर गणना किया गया समतुल्य वेतन ${periodHi} ₹${normalizedWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }

  const statFormatted = `₹${applicableStatutory.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const diffFormatted = `₹${shortfallAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let expEn, expKn, expHi;
  if (isShortfall) {
    expEn = `Under ${verifiedRecord.legal_authority} (${verifiedRecord.notification_number}) for ${verifiedRecord.applicable_zone} (${verifiedRecord.schedule_name}), the statutory minimum wage is ${statFormatted} per ${periodEn}. ${repClauseEn} indicates a shortfall of ${diffFormatted} per ${periodEn} (${shortfallPct.toFixed(1)}% below legal minimum rate).`;
    expKn = `ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ ಅಧಿಸೂಚನೆ (${verifiedRecord.notification_number}) ಪ್ರಕಾರ, ${verifiedRecord.applicable_zone} (ಬಿಬಿಎಂಪಿ ಬೆಂಗಳೂರು) ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ${verifiedRecord.schedule_name} ವರ್ಗಕ್ಕೆ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ${periodKn} ${statFormatted}. ${repClauseKn} ಆಗಿದ್ದು, ಇದು ಕಾನೂನುಬದ್ಧ ಕನಿಷ್ಠ ವೇತನಕ್ಕಿಂತ ${diffFormatted} ಕಡಿಮೆಯಾಗಿದೆ (${shortfallPct.toFixed(1)}% ಕೊರತೆ).`;
    expHi = `कर्नाटक श्रम विभाग की अधिसूचना (${verifiedRecord.notification_number}) के अनुसार, ${verifiedRecord.applicable_zone} (बीबीएमपी बेंगलुरु) के तहत ${verifiedRecord.schedule_name} के लिए वैधानिक न्यूनतम वेतन ${periodHi} ${statFormatted} है। ${repClauseHi} है, जो कानूनी न्यूनतम वेतन से ${diffFormatted} कम है (${shortfallPct.toFixed(1)}% कमी)।`;
  } else {
    expEn = `Under ${verifiedRecord.legal_authority} (${verifiedRecord.notification_number}) for ${verifiedRecord.applicable_zone} (${verifiedRecord.schedule_name}), the statutory minimum wage is ${statFormatted} per ${periodEn}. ${repClauseEn} meets or exceeds the statutory minimum wage rate.`;
    expKn = `ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಕಾರ್ಮಿಕ ಇಲಾಖೆಯ ಅಧಿಸೂಚನೆ (${verifiedRecord.notification_number}) ಪ್ರಕಾರ, ${verifiedRecord.applicable_zone} (ಬಿಬಿಎಂಪಿ ಬೆಂಗಳೂರು) ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ${verifiedRecord.schedule_name} ವರ್ಗಕ್ಕೆ ಶಾಸನಬದ್ಧ ಕನಿಷ್ಠ ವೇತನ ${periodKn} ${statFormatted}. ${repClauseKn} ಕನಿಷ್ಠ ವೇತನಕ್ಕಿಂತ ಸಮನಾಗಿದೆ ಅಥವಾ ಹೆಚ್ಚಾಗಿದೆ.`;
    expHi = `कर्नाटक श्रम विभाग की अधिसूचना (${verifiedRecord.notification_number}) के अनुसार, ${verifiedRecord.applicable_zone} (बीबीएमपी बेंगलुरु) के तहत ${verifiedRecord.schedule_name} के लिए वैधानिक न्यूनतम वेतन ${periodHi} ${statFormatted} है। ${repClauseHi} न्यूनतम वेतन के बराबर या उससे अधिक है।`;
  }

  return {
    status,
    shortfall_indicated: isShortfall,
    shortfall_amount: shortfallAmount,
    shortfall_percentage: shortfallPct,
    applicable_minimum_wage: applicableStatutory,
    reported_wage: wage,
    reported_wage_period: wage_period,
    reported_wage_normalized: normalizedWage,
    comparison_period: comparisonPeriod,
    verified_record: verifiedRecord,
    calculation_details: {
      comparison_period: comparisonPeriod,
      reported_wage_input: wage,
      reported_wage_period: wage_period,
      reported_wage_normalized: normalizedWage,
      applicable_statutory_wage: applicableStatutory,
      hours_per_day_used: hoursUsed,
      working_days_factor_used: daysFactor,
      calculation_basis: calcBasis
    },
    explanation_en: expEn,
    explanation_kn: expKn,
    explanation_hi: expHi,
    missing_fields: [],
    disclaimer: selectedMock.disclaimer,
    worker_id,
    _is_mock: true
  };
}
