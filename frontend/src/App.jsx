import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StepIndicator } from './components/StepIndicator';
import { Screen1Speak } from './components/Screen1Speak';
import { Screen2Confirm } from './components/Screen2Confirm';
import { Screen3Result } from './components/Screen3Result';
import { translations } from './i18n/translations';
import { checkBackendHealth, compareWage } from './services/api';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState('kn');
  const [currentStep, setCurrentStep] = useState(1);
  const [isMockMode, setIsMockMode] = useState(false);
  const [backendStatus, setBackendStatus] = useState({
    online: false,
    verified_records_count: 0
  });

  // State across flow
  const [workerInput, setWorkerInput] = useState({
    rawText: '',
    extracted: {}
  });
  const [confirmedData, setConfirmedData] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Active translation dictionary
  const t = translations[lang] || translations.kn;

  // Check backend health on mount
  const checkHealth = useCallback(async () => {
    try {
      const res = await checkBackendHealth();
      if (res && res.online) {
        setBackendStatus({
          online: true,
          verified_records_count: res.verified_records_count || 9,
          service: res.service,
          version: res.version
        });
      } else {
        setBackendStatus({
          online: false,
          verified_records_count: 0,
          error: res?.error || 'Offline'
        });
      }
    } catch (err) {
      setBackendStatus({
        online: false,
        verified_records_count: 0,
        error: err.message
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Step 1: When user completes voice or text input
  const handleProceedFromStep1 = ({ rawText, extracted }) => {
    setWorkerInput({ rawText, extracted });
    // Initialize or merge confirmedData
    setConfirmedData(prev => ({
      ...extracted,
      ...(prev || {})
    }));
    setApiError(null);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2: Back to Step 1
  const handleBackToStep1 = () => {
    setApiError(null);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2: Confirm and submit for verification
  const handleConfirmAndCompare = async (formData) => {
    setIsLoading(true);
    setApiError(null);
    setConfirmedData(formData);

    try {
      const response = await compareWage(
        {
          ...formData,
          preferred_language: lang
        },
        isMockMode
      );

      if (response.success && response.data) {
        setComparisonResult(response);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (response.validationError && response.data) {
        // Backend returned structured validation failure (e.g. 422)
        setComparisonResult(response);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setApiError(
          response.error || (lang === 'kn'
            ? 'ಸರ್ವರ್‌ನಿಂದ ಪ್ರತಿಕ್ರಿಯೆ ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.'
            : lang === 'hi'
            ? 'सर्वर से प्रतिक्रिया प्राप्त नहीं हुई। कृपया पुनः प्रयास करें।'
            : 'Could not connect to the verification engine. Please try again.')
        );
      }
    } catch (err) {
      setApiError(err.message || 'An unexpected error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Back to Step 2 (Edit details)
  const handleBackToStep2 = () => {
    setApiError(null);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3: Start fresh check
  const handleResetAll = () => {
    setWorkerInput({ rawText: '', extracted: {} });
    setConfirmedData(null);
    setComparisonResult(null);
    setApiError(null);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Allow clicking completed steps on StepIndicator
  const handleStepClick = (targetStep) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100/60 text-stone-900 font-kannada">
      
      {/* Universal Top Header with Language Selector & Mock Mode Switch */}
      <Header
        lang={lang}
        setLang={setLang}
        t={t}
        isMockMode={isMockMode}
        setIsMockMode={setIsMockMode}
        backendStatus={backendStatus}
        refreshBackendStatus={checkHealth}
      />

      {/* Main Flow Area */}
      <main className="flex-1 pb-12">
        {/* Step Progress Bar */}
        <StepIndicator
          currentStep={currentStep}
          setStep={handleStepClick}
          t={t}
        />

        {/* Global Error Banner (if API call fails hard) */}
        {apiError && (
          <div className="w-full max-w-4xl mx-auto px-4 mb-4">
            <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">{apiError}</p>
                  <p className="text-xs text-rose-700 mt-0.5">
                    {lang === 'kn'
                      ? 'ನೀವು ಡೆಮೊ ಮೋಡ್ ಅನ್ನು ಆನ್ ಮಾಡಬಹುದು ಅಥವಾ ಸರ್ವರ್ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.'
                      : lang === 'hi'
                      ? 'आप डेमो / मॉक मोड चालू कर सकते हैं या सर्वर कनेक्शन की जांच कर सकते हैं।'
                      : 'You can toggle Demo / Mock Mode in the header or retry.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsMockMode(true);
                    setApiError(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold border border-purple-300 transition-all"
                >
                  {lang === 'kn' ? 'ಡೆಮೊ ಮೋಡ್ ಬಳಸಿ' : lang === 'hi' ? 'डेमो मोड चालू करें' : 'Switch to Demo Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => setApiError(null)}
                  className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Voice / Text Entry */}
        {currentStep === 1 && (
          <Screen1Speak
            t={t}
            lang={lang}
            onProceed={handleProceedFromStep1}
            initialText={workerInput.rawText}
          />
        )}

        {/* Step 2: Review and Confirm Details */}
        {currentStep === 2 && (
          <Screen2Confirm
            t={t}
            lang={lang}
            initialData={confirmedData || workerInput.extracted || {}}
            onBack={handleBackToStep1}
            onConfirm={handleConfirmAndCompare}
            isLoading={isLoading}
          />
        )}

        {/* Step 3: Understand Result */}
        {currentStep === 3 && (
          <Screen3Result
            t={t}
            lang={lang}
            result={comparisonResult?.data}
            workerData={confirmedData}
            isMock={comparisonResult?.isMock}
            source={comparisonResult?.source}
            onBack={handleBackToStep2}
            onReset={handleResetAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-stone-600">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>ನಮ್ಮ ಸಂಬಳ (Namma Sambala) • Karnataka Minimum Wages Act, 1948</span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl mx-auto font-latin">
            Deterministic statutory wage evaluation against authoritative Karnataka Labour Department notifications for Bengaluru (Zone 1 - BBMP).
          </p>
        </div>
      </footer>

    </div>
  );
}
