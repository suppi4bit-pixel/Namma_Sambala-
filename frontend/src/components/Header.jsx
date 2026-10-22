import React from 'react';
import { Volume2, ShieldCheck, Database, RefreshCw, Languages } from 'lucide-react';

export function Header({
  lang,
  setLang,
  t,
  isMockMode,
  setIsMockMode,
  backendStatus,
  refreshBackendStatus
}) {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo and Titles */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-red-600 flex items-center justify-center shadow-md shrink-0">
              <span className="text-white font-extrabold text-2xl tracking-tight">₹</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-stone-900 tracking-tight font-kannada">
                  {t.appTitle}
                </h1>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  ಕರ್ನಾಟಕ / Karnataka
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 font-medium font-latin">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Controls: Language Selector & Mode Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Backend / Mock Status Indicator */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMockMode(!isMockMode)}
                title={t.toggleMock}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isMockMode
                    ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                    : backendStatus.online
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMockMode
                      ? 'bg-purple-600 animate-pulse'
                      : backendStatus.online
                      ? 'bg-emerald-600'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="hidden md:inline">
                  {isMockMode
                    ? 'Mock Mode'
                    : backendStatus.online
                    ? `Live API (${backendStatus.verified_records_count} Records)`
                    : 'Fallback Mode'}
                </span>
                <span className="md:hidden">
                  {isMockMode ? 'Mock' : backendStatus.online ? 'Live' : 'Fallback'}
                </span>
              </button>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setLang('kn')}
                className={`px-3 py-1 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  lang === 'kn'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                ಕನ್ನಡ
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-3 py-1 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  lang === 'hi'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3 py-1 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  lang === 'en'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                English
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
