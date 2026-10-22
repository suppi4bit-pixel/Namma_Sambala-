import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, HelpCircle, Briefcase, MapPin, Clock, IndianRupee } from 'lucide-react';
import { OCCUPATIONS, SECTORS } from '../data/wageSchedules';

export function Screen2Confirm({
  t,
  lang,
  initialData,
  onBack,
  onConfirm,
  isLoading
}) {
  const [formData, setFormData] = useState({
    sector: initialData.sector || 'security',
    job_category: initialData.job_category || 'security_guard',
    custom_job_title: '',
    skill_classification: initialData.skill_classification || 'semi_skilled',
    zone: initialData.zone || 'Zone 1',
    location: initialData.location || 'Bengaluru',
    reported_wage: initialData.reported_wage || '',
    wage_period: initialData.wage_period || 'monthly',
    hours_per_day: initialData.hours_per_day || '8',
    days_per_month: initialData.days_per_month || '26'
  });

  const [errors, setErrors] = useState({});

  // Filter occupations according to chosen sector
  const availableOccupations = OCCUPATIONS.filter(
    occ => occ.sector === formData.sector
  );

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-update skill classification when an occupation is selected
      if (field === 'job_category') {
        const found = OCCUPATIONS.find(o => o.id === value);
        if (found) {
          updated.skill_classification = found.skill;
          updated.sector = found.sector;
        }
      }

      // If sector changes, set default job in that sector
      if (field === 'sector') {
        const firstOcc = OCCUPATIONS.find(o => o.sector === value);
        if (firstOcc) {
          updated.job_category = firstOcc.id;
          updated.skill_classification = firstOcc.skill;
        }
      }

      return updated;
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    const wageNum = parseFloat(formData.reported_wage);

    if (isNaN(wageNum) || wageNum <= 0) {
      errs.reported_wage = t.validationWageReq;
    }

    if (!formData.job_category) {
      errs.job_category = t.validationJobReq;
    }

    if (formData.wage_period === 'hourly') {
      const hoursNum = parseFloat(formData.hours_per_day);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        errs.hours_per_day = t.validationHoursReq;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onConfirm({
      ...formData,
      reported_wage: parseFloat(formData.reported_wage),
      hours_per_day: parseFloat(formData.hours_per_day) || 8.0,
      days_per_month: parseInt(formData.days_per_month, 10) || 26
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-stone-100 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-kannada tracking-tight">
              {t.screen2Title}
            </h2>
            <p className="mt-1 text-stone-600 text-sm sm:text-base font-kannada">
              {t.screen2Subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-stone-700 bg-stone-100 hover:bg-stone-200 text-sm font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.btnBack}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Row 1: Sector & Job Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sector */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-1.5 font-kannada flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-amber-600" />
                {t.fieldSector}
              </label>
              <select
                value={formData.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                className="w-full p-3.5 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 outline-none font-medium bg-stone-50 text-stone-900 text-base"
              >
                {SECTORS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t[s.translationKey] || s.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Occupation */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-1.5 font-kannada flex items-center gap-1.5">
                <span>{t.fieldJob}</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.job_category}
                onChange={(e) => handleChange('job_category', e.target.value)}
                className={`w-full p-3.5 rounded-xl border-2 ${
                  errors.job_category ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-stone-50'
                } focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 outline-none font-medium text-stone-900 text-base`}
              >
                {availableOccupations.length > 0 ? (
                  availableOccupations.map((occ) => (
                    <option key={occ.id} value={occ.id}>
                      {occ.label[lang] || occ.label.en}
                    </option>
                  ))
                ) : (
                  <option value="security_guard">Security Guard</option>
                )}
              </select>
              {errors.job_category && (
                <p className="mt-1 text-xs text-red-600 font-bold">{errors.job_category}</p>
              )}
            </div>
          </div>

          {/* Row 2: Skill Category & Location/Zone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Skill Category */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-1.5 font-kannada">
                {t.fieldSkill}
              </label>
              <select
                value={formData.skill_classification}
                onChange={(e) => handleChange('skill_classification', e.target.value)}
                className="w-full p-3.5 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 outline-none font-medium bg-stone-50 text-stone-900 text-base"
              >
                <option value="unskilled">{t.skillUnskilled}</option>
                <option value="semi_skilled">{t.skillSemiSkilled}</option>
                <option value="skilled">{t.skillSkilled}</option>
                <option value="highly_skilled">{t.skillHighlySkilled}</option>
              </select>
            </div>

            {/* Work Location / Zone */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-1.5 font-kannada flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                {t.fieldZone}
              </label>
              <select
                value={formData.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                className="w-full p-3.5 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 outline-none font-medium bg-stone-50 text-stone-900 text-base"
              >
                <option value="Zone 1">{t.zone1}</option>
                <option value="Zone 2">{t.zone2}</option>
                <option value="Zone 3">{t.zone3}</option>
                <option value="Zone 4">{t.zone4}</option>
              </select>
              <p className="mt-1 text-xs text-stone-500 font-kannada">{t.zone1Helper}</p>
            </div>
          </div>

          {/* Row 3: Wage Amount & Wage Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
            {/* Wage Amount */}
            <div>
              <label className="block text-sm font-bold text-amber-950 mb-1.5 font-kannada flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-amber-700" />
                <span>{t.fieldWageAmount}</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-stone-500 font-bold text-lg">₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={formData.reported_wage}
                  onChange={(e) => handleChange('reported_wage', e.target.value)}
                  placeholder="e.g. 12000"
                  className={`w-full pl-9 pr-4 py-3.5 rounded-xl border-2 ${
                    errors.reported_wage ? 'border-red-400 bg-red-50' : 'border-amber-300 bg-white'
                  } focus:border-amber-600 focus:ring-3 focus:ring-amber-500/20 outline-none font-bold text-stone-900 text-xl tracking-wide`}
                />
              </div>
              {errors.reported_wage && (
                <p className="mt-1 text-xs text-red-600 font-bold">{errors.reported_wage}</p>
              )}
            </div>

            {/* Wage Period */}
            <div>
              <label className="block text-sm font-bold text-amber-950 mb-1.5 font-kannada">
                {t.fieldWagePeriod}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'monthly', label: t.periodMonthly },
                  { id: 'daily', label: t.periodDaily },
                  { id: 'hourly', label: t.periodHourly },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChange('wage_period', p.id)}
                    className={`py-3.5 px-2 rounded-xl text-xs sm:text-sm font-bold border transition-all text-center ${
                      formData.wage_period === p.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Working Hours & Days */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Daily Working Hours */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-1.5 font-kannada flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{t.fieldHoursPerDay}</span>
                {formData.wage_period === 'hourly' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="24"
                value={formData.hours_per_day}
                onChange={(e) => handleChange('hours_per_day', e.target.value)}
                className={`w-full p-3.5 rounded-xl border-2 ${
                  errors.hours_per_day ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-stone-50'
                } focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 outline-none font-semibold text-stone-900 text-base`}
              />
              <p className="mt-1 text-xs text-stone-500 font-kannada">{t.hoursHelper}</p>
              {errors.hours_per_day && (
                <p className="mt-1 text-xs text-red-600 font-bold">{errors.hours_per_day}</p>
              )}
            </div>

            {/* Monthly Working Days */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-1.5 font-kannada">
                {t.fieldDaysPerMonth}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.days_per_month}
                onChange={(e) => handleChange('days_per_month', e.target.value)}
                className="w-full p-3.5 rounded-xl border-2 border-stone-200 focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 outline-none font-semibold bg-stone-50 text-stone-900 text-base"
              />
              <p className="mt-1 text-xs text-stone-500 font-kannada">{t.daysHelper}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-stone-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border-2 border-stone-300 text-stone-700 hover:bg-stone-100 font-bold font-kannada text-base transition-all"
            >
              {t.btnBack}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 font-kannada"
            >
              {isLoading ? (
                <span>{t.btnProcessing}</span>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>{t.btnVerify}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
