import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, ArrowRight, AlertCircle, Sparkles, Volume2, Check } from 'lucide-react';
import { SpeechService, extractDetailsFromText } from '../services/voiceExtractor';
import { extractWageFromTranscript } from '../services/api';

export function Screen1Speak({
  t,
  lang,
  onProceed,
  initialText = ''
}) {
  const [inputText, setInputText] = useState(initialText);
  const [isRecording, setIsRecording] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [micError, setMicError] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const speechServiceRef = useRef(null);

  useEffect(() => {
    speechServiceRef.current = new SpeechService();
    setSpeechSupported(speechServiceRef.current.isSupported());

    return () => {
      if (speechServiceRef.current) {
        speechServiceRef.current.stop();
      }
    };
  }, []);

  const handleStartRecording = () => {
    setMicError(null);
    setValidationError('');

    if (!speechServiceRef.current || !speechServiceRef.current.isSupported()) {
      setMicError(t.micNotSupported);
      return;
    }

    const langCode = lang === 'kn' ? 'kn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';

    setIsRecording(true);
    speechServiceRef.current.start({
      lang: langCode,
      onTranscript: ({ full }) => {
        setInputText(full);
      },
      onError: (err) => {
        setIsRecording(false);
        if (err.type === 'permission_denied') {
          setMicError(t.micDenied);
        } else if (err.type === 'not_supported') {
          setMicError(t.micNotSupported);
        } else {
          setMicError(t.micError);
        }
      },
      onEnd: () => {
        setIsRecording(false);
      }
    });
  };

  const handleStopRecording = () => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleExampleClick = (exampleText) => {
    setInputText(exampleText);
    setValidationError('');
    setMicError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setValidationError(t.errorEmptyInput);
      return;
    }

    setIsExtracting(true);
    setValidationError('');

    try {
      // 1. Run client-side heuristic parser
      const heuristicData = extractDetailsFromText(inputText);

      // 2. Attempt live backend Gemini AI extraction via POST /api/extract
      const aiRes = await extractWageFromTranscript(inputText);
      if (aiRes && aiRes.success && aiRes.profile) {
        const p = aiRes.profile;
        const mergedMissing = Array.from(new Set([
          ...(p.missing_or_uncertain_fields || []),
          ...(heuristicData.missing_or_uncertain_fields || [])
        ]));
        const mergedData = {
          ...heuristicData,
          job_category: p.job_role || heuristicData.job_category || '',
          sector: p.sector || heuristicData.sector || 'security',
          skill_classification: p.skill_category || heuristicData.skill_classification || 'semi_skilled',
          reported_wage: p.wage_amount != null ? String(p.wage_amount) : (heuristicData.reported_wage || ''),
          wage_period: p.wage_period || heuristicData.wage_period || '',
          location: p.location || heuristicData.location || 'Bengaluru',
          zone: 'Zone 1',
          hours_per_day: p.working_hours_per_day != null ? String(p.working_hours_per_day) : (heuristicData.hours_per_day || '8'),
          days_per_month: heuristicData.days_per_month || '26',
          missing_or_uncertain_fields: mergedMissing,
          confirmation_required: Boolean(p.confirmation_required || heuristicData.confirmation_required || mergedMissing.length > 0),
          isAiExtracted: true
        };
        onProceed({
          rawText: inputText,
          extracted: mergedData,
          extractionSource: 'Live Gemini AI Backend (/api/extract)'
        });
      } else {
        // Fallback to client heuristic parser
        onProceed({
          rawText: inputText,
          extracted: heuristicData,
          extractionSource: 'Local Heuristic Parser'
        });
      }
    } catch {
      const fallbackData = extractDetailsFromText(inputText);
      onProceed({
        rawText: inputText,
        extracted: fallbackData,
        extractionSource: 'Local Heuristic Parser'
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm">
        
        {/* Screen Header */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-3 border border-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            {t.step1}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-kannada tracking-tight leading-snug">
            {t.screen1Title}
          </h2>
          <p className="mt-2 text-stone-600 text-sm sm:text-base font-kannada">
            {t.screen1Subtitle}
          </p>
        </div>

        {/* Microphone Button Section */}
        <div className="flex flex-col items-center justify-center my-6 sm:my-8">
          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40 scale-125 pointer-events-none" />
            )}
            <button
              type="button"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-lg ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse-mic hover:bg-red-700 ring-8 ring-red-100'
                  : 'bg-gradient-to-tr from-amber-600 via-amber-500 to-red-500 text-white hover:from-amber-700 hover:to-red-600 hover:scale-105 active:scale-95 ring-8 ring-amber-100/60'
              }`}
              aria-label={isRecording ? t.micStop : t.micStart}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-9 h-9 sm:w-10 sm:h-10 mb-1" />
                  <span className="text-xs font-bold uppercase tracking-wider">{t.micStop}</span>
                </>
              ) : (
                <>
                  <Mic className="w-9 h-9 sm:w-10 sm:h-10 mb-1" />
                  <span className="text-xs font-bold font-kannada text-center px-1">
                    {t.micStart}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Recording Status Indicator */}
          <div className="mt-4 text-center">
            {isRecording ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-bold border border-red-300 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span className="font-kannada">{t.micListening}</span>
              </div>
            ) : (
              <span className="text-xs text-stone-500 font-medium">
                {speechSupported ? 'ಕನ್ನಡ, हिन्दी, English ಆಡಿಯೋ ಬೆಂಬಲವಿದೆ' : 'ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲದಿದ್ದಲ್ಲಿ ಕೆಳಗೆ ಬರೆಯಿರಿ'}
              </span>
            )}
          </div>

          {/* Mic Error Notice */}
          {micError && (
            <div className="mt-4 max-w-lg w-full bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-2xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{micError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Text Input Section (for workers who cannot or prefer not to use mic) */}
        <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4">
          <div>
            <label className="block text-sm sm:text-base font-bold text-stone-800 mb-2 font-kannada">
              {t.orType}
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder={t.inputPlaceholder}
                className="w-full text-base sm:text-lg p-4 rounded-2xl border-2 border-stone-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 outline-none transition-all resize-none text-stone-800 placeholder-stone-400 font-kannada bg-stone-50/50"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute top-3 right-3 text-xs bg-stone-200 hover:bg-stone-300 text-stone-700 px-2 py-1 rounded-md"
                >
                  ತೆರವುಗೊಳಿಸಿ (Clear)
                </button>
              )}
            </div>
            {validationError && (
              <p className="mt-2 text-sm text-red-600 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {validationError}
              </p>
            )}
          </div>

          {/* Quick Scenario Chips */}
          <div className="pt-2">
            <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 font-latin">
              {t.tryExamples}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: t.example1, text: "ನಾನು ಬೆಂಗಳೂರಿನಲ್ಲಿ ಸೆಕ್ಯುರಿಟಿ ಗಾರ್ಡ್ ಆಗಿ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ, ನನಗೆ ತಿಂಗಳಿಗೆ ₹12,000 ಸಂಬಳ ಬರುತ್ತದೆ" },
                { label: t.example2, text: "ನಾನು ಅಂಗಡಿಯ ಸಹಾಯಕ (Helper) ಆಗಿ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ, ನನಗೆ ದಿನಕ್ಕೆ ₹450 ಸಿಗುತ್ತದೆ" },
                { label: t.example3, text: "ನಾನು ಬೆಂಗಳೂರಿನಲ್ಲಿ ಕಟ್ಟಡ ಮೇಸ್ತ್ರಿ (Mason), ನನಗೆ ದಿನಕ್ಕೆ ₹650 ಕೂಲಿ ಬರುತ್ತದೆ" },
                { label: t.example4, text: "ನಾನು ಬೆಂಗಳೂರಿನಲ್ಲಿ ಮನೆ ಅಡುಗೆ ಕೆಲಸ (Domestic Cook) ಮಾಡುತ್ತೇನೆ, ತಿಂಗಳಿಗೆ ₹18,000 ಸಿಗುತ್ತದೆ" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleExampleClick(item.text)}
                  className="text-left px-3.5 py-2.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 hover:bg-amber-50/60 transition-all text-xs sm:text-sm text-stone-800 font-medium font-kannada flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{item.label}</span>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Submit / Continue Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isExtracting}
              className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 font-kannada"
            >
              {isExtracting ? (
                <span>{t.btnProcessing}</span>
              ) : (
                <>
                  <span>{t.btnContinue}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
