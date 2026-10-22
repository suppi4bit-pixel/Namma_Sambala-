import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Volume2,
  VolumeX,
  ArrowLeft,
  RotateCcw,
  Printer,
  ExternalLink,
  ShieldAlert,
  Info,
  Calendar,
  Building2
} from 'lucide-react';
import { playAudioExplanation, stopAudioExplanation } from '../services/voiceExtractor';

/**
 * Helper to get a natural narrative explanation in the user's selected language.
 */
function getExplanation(result, lang, workerData) {
  if (!result) return '';

  if (lang === 'kn') {
    return result.explanation_kn || result.explanation_en || '';
  }

  if (lang === 'en') {
    return result.explanation_en || '';
  }

  // Hindi localization
  if (result.explanation_hi) {
    return result.explanation_hi;
  }

  if (result.status === 'shortfall_indicated') {
    const periodHi = result.comparison_period === 'daily' ? 'प्रति दिन' : result.comparison_period === 'hourly' ? 'प्रति घंटा' : 'प्रति माह';
    const wageStr = result.applicable_minimum_wage ? `₹${result.applicable_minimum_wage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    const repWage = result.reported_wage_normalized ?? workerData?.reported_wage;
    const repStr = repWage !== undefined ? `₹${Number(repWage).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    const diffStr = result.shortfall_amount ? `₹${result.shortfall_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    const pctStr = result.shortfall_percentage ? ` (${result.shortfall_percentage}% कमी)` : '';
    const sched = result.verified_record?.schedule_name || 'कर्नाटक न्यूनतम वेतन अनुसूची';
    return `कर्नाटक श्रम विभाग (${sched}) के अनुसार, वैधानिक न्यूनतम वेतन ${wageStr} ${periodHi} है। आपका सूचित वेतन ${repStr} है, जो ${diffStr} ${periodHi} की संभावित कमी दर्शाता है${pctStr}।`;
  }

  if (result.status === 'no_shortfall_indicated') {
    const sched = result.verified_record?.schedule_name || 'कर्नाटक न्यूनतम वेतन अनुसूची';
    const repWage = result.reported_wage_normalized ?? workerData?.reported_wage;
    const repStr = repWage !== undefined ? `₹${Number(repWage).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    return `कर्नाटक श्रम विभाग (${sched}) के अनुसार, आपका सूचित वेतन ${repStr} सरकारी न्यूनतम वेतन मानकों को पूरा करता है या उससे अधिक है। इस तुलना में कोई कमी नहीं पाई गई।`;
  }

  if (result.status === 'rate_not_verified') {
    return 'इस पद या क्षेत्र के लिए वर्तमान में सत्यापित सरकारी न्यूनतम वेतन रिकॉर्ड उपलब्ध नहीं है। कर्नाटक श्रम विभाग की आधिकारिक अधिसूचनाओं के आधार पर केवल सत्यापित पदों का ही मूल्यांकन किया जाता है।';
  }

  if (result.status === 'more_details_needed') {
    return 'सटीक कानूनी तुलना के लिए कुछ महत्वपूर्ण विवरण अनुपलब्ध हैं। कृपया अपने पद, कौशल श्रेणी या काम के घंटों की पुष्टि करें।';
  }

  return result.explanation_en || '';
}

/**
 * Format currency in Indian numbering system.
 */
function formatRupees(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function Screen3Result({
  t,
  lang,
  result,
  workerData,
  isMock,
  source,
  onBack,
  onReset
}) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopAudioExplanation();
    };
  }, []);

  // Determine if backend returned a valid, applicable benchmark
  const hasValidBenchmark = Boolean(
    result &&
    (result.status === 'shortfall_indicated' || result.status === 'no_shortfall_indicated') &&
    typeof result.applicable_minimum_wage === 'number' &&
    result.applicable_minimum_wage > 0 &&
    result.verified_record
  );

  const isShortfall = Boolean(result?.shortfall_indicated && result?.shortfall_amount > 0);
  const isNeedsVerification = !hasValidBenchmark;

  // Values
  const comparisonPeriod = result?.comparison_period || workerData?.wage_period || 'monthly';
  const periodLabel = comparisonPeriod === 'daily'
    ? (lang === 'kn' ? 'ಪ್ರತಿ ದಿನ' : lang === 'hi' ? 'प्रति दिन' : 'per day')
    : comparisonPeriod === 'hourly'
    ? (lang === 'kn' ? 'ಪ್ರತಿ ಗಂಟೆಗೆ' : lang === 'hi' ? 'प्रति घंटा' : 'per hour')
    : (lang === 'kn' ? 'ಪ್ರತಿ ತಿಂಗಳಿಗೆ' : lang === 'hi' ? 'प्रति माह' : 'per month');

  const reportedWage = result?.reported_wage_normalized ?? result?.calculation_details?.reported_wage_normalized ?? workerData?.reported_wage;
  const benchmarkWage = hasValidBenchmark ? result.applicable_minimum_wage : null;

  const explanation = getExplanation(result, lang, workerData);

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopAudioExplanation();
      setIsPlayingAudio(false);
    } else {
      if (!explanation) return;
      const success = playAudioExplanation(explanation, lang);
      if (success) {
        setIsPlayingAudio(true);
        // Estimate speech duration to auto-toggle icon
        const words = explanation.split(/\s+/).length;
        const durationMs = Math.max(3000, (words / 2.5) * 1000);
        setTimeout(() => setIsPlayingAudio(false), durationMs);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      
      {/* Top Banner & Status Card */}
      <div
        className={`rounded-3xl p-5 sm:p-8 border shadow-sm transition-all ${
          isNeedsVerification
            ? 'bg-amber-50/80 border-amber-300 text-amber-950'
            : isShortfall
            ? 'bg-rose-50/80 border-rose-300 text-rose-950'
            : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                isNeedsVerification
                  ? 'bg-amber-500 text-white'
                  : isShortfall
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isNeedsVerification ? (
                <HelpCircle className="w-7 h-7" />
              ) : isShortfall ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isNeedsVerification
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : isShortfall
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}
                >
                  {isNeedsVerification
                    ? (lang === 'kn' ? 'ಪರಿಶೀಲನೆಯ ಅಗತ್ಯವಿದೆ' : lang === 'hi' ? 'सत्यापन आवश्यक' : 'Needs Verification')
                    : isShortfall
                    ? (lang === 'kn' ? 'ವೇತನ ಕೊರತೆ ಸಂಭವ' : lang === 'hi' ? 'संभावित वेतन कमी' : 'Shortfall Indicated')
                    : (lang === 'kn' ? 'ನಿಯಮಾನುಸಾರ ವೇತನ' : lang === 'hi' ? 'मानक के अनुसार' : 'Compliant Rate')}
                </span>

                {isMock ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                    {source || 'Mock Dataset (Demo)'}
                  </span>
                ) : (
                  source && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {source}
                    </span>
                  )
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 font-kannada">
                {isNeedsVerification
                  ? (t.statusUnverifiedTitle || 'Needs Verification')
                  : isShortfall
                  ? t.statusShortfallTitle
                  : t.statusNoShortfallTitle}
              </h2>
            </div>
          </div>

          {/* Audio explanation button */}
          <button
            type="button"
            onClick={handleToggleAudio}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm border shadow-xs transition-all ${
              isPlayingAudio
                ? 'bg-red-600 text-white border-red-700 animate-pulse'
                : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-300'
            }`}
            title={isPlayingAudio ? t.stopAudio : t.listenAudio}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>{t.stopAudio}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span>{t.listenAudio}</span>
              </>
            )}
          </button>
        </div>

        {/* Narrative Explanation in Selected Language */}
        <div className="mt-4 p-4 rounded-2xl bg-white/90 border border-stone-200/80 shadow-xs">
          <p className="text-base sm:text-lg font-medium text-stone-800 font-kannada leading-relaxed">
            {explanation}
          </p>

          {/* Bilingual subtext for clarity if in Hindi or Kannada */}
          {lang !== 'en' && result?.explanation_en && (
            <p className="mt-2 text-xs sm:text-sm text-stone-600 border-t border-stone-100 pt-2 font-latin italic">
              <strong>English Reference:</strong> {result.explanation_en}
            </p>
          )}
        </div>
      </div>

      {/* Main 3 Metrics: Reported Wage, Benchmark, Difference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1: Reported Wage */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 font-latin">
              {t.reportedWageCard}
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-latin">
                {formatRupees(reportedWage)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-600 font-kannada">
            <span>{periodLabel}</span>
            <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold">
              {workerData?.wage_period || 'monthly'}
            </span>
          </div>
        </div>

        {/* Metric 2: Verified Minimum-Wage Benchmark */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border shadow-sm flex flex-col justify-between ${
            hasValidBenchmark
              ? 'bg-white border-stone-200'
              : 'bg-amber-50/60 border-amber-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 font-latin">
              {t.statutoryWageCard}
            </span>
            <div className="mt-2">
              {hasValidBenchmark ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-latin">
                    {formatRupees(benchmarkWage)}
                  </span>
                </div>
              ) : (
                <div className="mt-1">
                  <span className="inline-block px-3 py-1 rounded-xl bg-amber-100 text-amber-900 font-extrabold text-sm sm:text-base border border-amber-300">
                    {lang === 'kn' ? 'ಪರಿಶೀಲನೆಯ ಅಗತ್ಯವಿದೆ' : lang === 'hi' ? 'सत्यापन की आवश्यकता है' : 'Needs Verification'}
                  </span>
                  <p className="mt-1 text-xs text-amber-800 font-medium font-kannada">
                    {lang === 'kn'
                      ? 'ಅಧಿಕೃತ ದರ ಲಭ್ಯವಿಲ್ಲ (Never invented)'
                      : lang === 'hi'
                      ? 'आधिकारिक मानक उपलब्ध नहीं'
                      : 'No official benchmark matched (never invented)'}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-600 font-kannada">
            <span>
              {hasValidBenchmark
                ? (result.verified_record?.applicable_zone || 'Zone 1 (BBMP)')
                : (lang === 'kn' ? 'ಅನ್ವಯವಾಗುವ ಮಾನದಂಡವಿಲ್ಲ' : lang === 'hi' ? 'कोई मानक नहीं' : 'No Benchmark')}
            </span>
            {hasValidBenchmark && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Official
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Difference / Potential Shortfall */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border shadow-sm flex flex-col justify-between ${
            !hasValidBenchmark
              ? 'bg-stone-50 border-stone-200'
              : isShortfall
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 font-latin">
              {isShortfall ? t.shortfallCard : (lang === 'kn' ? 'ವ್ಯತ್ಯಾಸ / ಸ್ಥಿತಿ' : lang === 'hi' ? 'अंतर / स्थिति' : 'Difference / Status')}
            </span>
            <div className="mt-2">
              {hasValidBenchmark ? (
                isShortfall ? (
                  <div className="flex items-baseline gap-1 text-rose-600 font-latin">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                      - {formatRupees(result.shortfall_amount)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 text-emerald-700 font-latin">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      ₹0.00 {lang === 'kn' ? 'ಕೊರತೆಯಿಲ್ಲ' : lang === 'hi' ? 'कोई कमी नहीं' : 'Shortfall'}
                    </span>
                  </div>
                )
              ) : (
                <div className="mt-1">
                  <span className="inline-block px-3 py-1 rounded-xl bg-stone-200 text-stone-700 font-bold text-sm">
                    {lang === 'kn' ? 'ಲೆಕ್ಕಾಚಾರ ಅಸಾಧ್ಯ' : lang === 'hi' ? 'गणना संभव नहीं' : 'Cannot Determine'}
                  </span>
                  <p className="mt-1 text-xs text-stone-500 font-kannada">
                    {lang === 'kn'
                      ? 'ಮಾನದಂಡವಿಲ್ಲದೆ ವ್ಯತ್ಯಾಸವನ್ನು ಲೆಕ್ಕಹಾಕಲಾಗುವುದಿಲ್ಲ'
                      : lang === 'hi'
                      ? 'मानक के बिना अंतर की गणना नहीं हो सकती'
                      : 'Difference requires an official benchmark'}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs font-medium font-kannada">
            {hasValidBenchmark ? (
              isShortfall ? (
                <span className="font-bold text-rose-700">
                  {result.shortfall_percentage}% {t.percentageBelow}
                </span>
              ) : (
                <span className="font-bold text-emerald-700">
                  {lang === 'kn' ? 'ಕಾನೂನುಬದ್ಧ ಕನಿಷ್ಠ ದರಕ್ಕಿಂತ ಹೆಚ್ಚು' : lang === 'hi' ? 'कानूनी दर के अनुरूप' : 'Meets or exceeds legal rate'}
                </span>
              )
            ) : (
              <span className="text-stone-500 font-semibold">
                {lang === 'kn' ? 'ಪರಿಶೀಲನೆ ಅಗತ್ಯ' : lang === 'hi' ? 'सत्यापन आवश्यक' : 'Verification Needed'}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Needs Verification Detailed Box (if applicable) */}
      {isNeedsVerification && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-amber-950 font-kannada">
                {lang === 'kn'
                  ? 'ಈ ಉದ್ಯೋಗಕ್ಕೆ ಅಧಿಕೃತ ದರ ಪರಿಶೀಲನೆ ಏಕೆ ಸಾಧ್ಯವಾಗಲಿಲ್ಲ?'
                  : lang === 'hi'
                  ? 'इस पद के लिए आधिकारिक न्यूनतम वेतन सत्यापित क्यों नहीं हुआ?'
                  : 'Why could an official benchmark not be matched?'}
              </h3>
              <p className="text-sm text-amber-900 font-kannada leading-relaxed">
                {result?.status === 'more_details_needed'
                  ? (lang === 'kn'
                      ? 'ಹೋಲಿಕೆಯನ್ನು ರೂಪಿಸಲು ಅಗತ್ಯವಿರುವ ವಿವರಗಳು ಕಾಣೆಯಾಗಿವೆ (ಉದಾ: ದಿನದ ಕೆಲಸದ ಗಂಟೆಗಳು ಅಥವಾ ಕೌಶಲ್ಯ ವರ್ಗ). ದಯವಿಟ್ಟು ವಿವರಗಳನ್ನು ಸರಿಪಡಿಸಿ.'
                      : lang === 'hi'
                      ? 'तुलना के लिए आवश्यक विवरण अनुपलब्ध हैं (उदा. कार्य के घंटे या कौशल श्रेणी)। कृपया विवरण संपादित करें।'
                      : 'Required fields are missing to formulate a legally justified comparison (e.g., daily working hours or skill classification). Please edit your details.')
                  : (lang === 'kn'
                      ? 'ನಮ್ಮ ಸಂಬಳ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಅಧಿಕೃತ ಗೆಜೆಟ್ ಅಧಿಸೂಚನೆಗಳ ಪ್ರಕಾರ ಮಾತ್ರ ದರಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ. ತಪ್ಪಾದ ಅಥವಾ ಊಹಾತ್ಮಕ ವೇತನವನ್ನು ಎಂದಿಗೂ ತೋರಿಸುವುದಿಲ್ಲ (Never invent a benchmark).'
                      : lang === 'hi'
                      ? 'नम्मा संबला केवल आधिकारिक सरकारी गजट अधिसूचनाओं से सत्यापित दरों की तुलना करता है। हम कभी भी काल्पनिक या अनुमानित मानक नहीं बनाते (Never invent a benchmark)।'
                      : 'Namma Sambala strictly verifies against published Karnataka Labour Department gazette notifications and never invents or fabricates an unverified benchmark rate.')}
              </p>

              {result?.missing_fields && result.missing_fields.length > 0 && (
                <div className="mt-3 bg-white/80 p-3 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    {lang === 'kn' ? 'ಕಾಣೆಯಾದ ಮಾಹಿತಿ:' : lang === 'hi' ? 'अनुपलब्ध जानकारी:' : 'Missing Information:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {result.missing_fields.map((f, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Government Source & Effective Date Card (if provided) */}
      {result?.verified_record && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-extrabold text-stone-900 font-kannada">
                {t.officialDetails}
              </h3>
            </div>
            {result.verified_record.source_url && (
              <a
                href={result.verified_record.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 underline font-latin"
              >
                <span>{t.officialLink}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {/* Legal Authority */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
              <span className="text-xs font-bold text-stone-500 block mb-1 font-kannada">
                {t.authority}
              </span>
              <p className="font-bold text-stone-800 font-latin">
                {result.verified_record.legal_authority || 'Government of Karnataka, Department of Labour'}
              </p>
            </div>

            {/* Notification Number */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
              <span className="text-xs font-bold text-stone-500 block mb-1 font-kannada">
                {t.notificationNumber}
              </span>
              <p className="font-bold text-stone-800 font-latin text-xs sm:text-sm">
                {result.verified_record.notification_number || 'Official Circular 2024-2025'}
              </p>
            </div>

            {/* Effective Period & Date */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
              <span className="text-xs font-bold text-stone-500 block mb-1 font-kannada flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                {t.effectivePeriod}
              </span>
              <p className="font-bold text-stone-800 font-latin">
                {result.verified_record.effective_from || '2024-04-01'} to {result.verified_record.effective_to || '2025-03-31'}
              </p>
            </div>

            {/* Applicable Schedule */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
              <span className="text-xs font-bold text-stone-500 block mb-1 font-kannada">
                {t.scheduleName}
              </span>
              <p className="font-bold text-stone-800 font-latin">
                {result.verified_record.schedule_name}
              </p>
            </div>

            {/* Matched Occupation & Skill */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
              <span className="text-xs font-bold text-stone-500 block mb-1 font-kannada">
                {t.fieldJob} & {t.fieldSkill}
              </span>
              <p className="font-bold text-stone-800 capitalize font-latin">
                {result.verified_record.matched_occupation.replace(/_/g, ' ')} ({result.verified_record.skill_classification.replace(/_/g, ' ')})
              </p>
            </div>

            {/* Zone */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
              <span className="text-xs font-bold text-stone-500 block mb-1 font-kannada">
                {t.fieldZone}
              </span>
              <p className="font-bold text-stone-800 font-latin">
                {result.verified_record.applicable_zone}
              </p>
            </div>
          </div>

          {/* Wage Components Breakdown (Basic + VDA) */}
          <div className="mt-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3 font-latin">
              {t.calculationBreakdown}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-xs text-stone-500 block">{t.basicWage}</span>
                <span className="text-sm font-bold text-stone-800">
                  {formatRupees(result.verified_record.basic_wage_monthly)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-xs text-stone-500 block">{t.vda}</span>
                <span className="text-sm font-bold text-stone-800">
                  {formatRupees(result.verified_record.vda_monthly)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-xs text-stone-500 block">{t.totalStatutory}</span>
                <span className="text-sm font-extrabold text-amber-900">
                  {formatRupees(result.verified_record.total_minimum_wage_monthly)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-xs text-stone-500 block">{t.dailyRateEquivalent}</span>
                <span className="text-sm font-bold text-stone-800">
                  {formatRupees(result.verified_record.total_minimum_wage_daily)}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Notes */}
          {result.verified_record.verification_notes && (
            <p className="text-xs text-stone-500 font-kannada pt-1">
              <strong>{t.notes}</strong> {result.verified_record.verification_notes}
            </p>
          )}
        </div>
      )}

      {/* Mandatory Legal Notice & Disclaimer */}
      <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-extrabold text-amber-950 font-kannada">
                {t.disclaimerTitle}
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black tracking-wide uppercase border border-amber-400">
                wage-awareness tool, not a legal determination
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 font-kannada leading-relaxed">
              {result?.disclaimer || t.disclaimerNotice}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons: Mobile-first with large touch targets */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Back and Edit Details Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl border-2 border-stone-300 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-800 font-extrabold text-base transition-all flex items-center justify-center gap-2 font-kannada shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.btnEditDetails}</span>
        </button>

        {/* Right side action buttons */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
          
          {/* Print / Save Summary Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-5 py-4 rounded-2xl border-2 border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 font-kannada"
          >
            <Printer className="w-4 h-4" />
            <span>{t.btnPrint}</span>
          </button>

          {/* Start New Wage Check Button */}
          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-kannada"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{t.btnNewCheck}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
