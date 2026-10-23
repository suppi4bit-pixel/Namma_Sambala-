import React from 'react';
import { Mic, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

export function StepIndicator({ currentStep, setStep, t }) {
  const steps = [
    { id: 1, title: t.step1, icon: Mic },
    { id: 2, title: t.step2, icon: FileText },
    { id: 3, title: t.step3, icon: CheckCircle2 }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-3">
      <div className="bg-white rounded-2xl p-2 sm:p-3 border border-stone-200 shadow-xs">
        <div className="grid grid-cols-3 gap-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;

            return (
              <div
                key={s.id}
                className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-900 font-bold'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 font-medium'
                    : 'text-stone-400 bg-stone-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className="hidden sm:inline text-xs sm:text-sm font-semibold truncate font-kannada">
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
