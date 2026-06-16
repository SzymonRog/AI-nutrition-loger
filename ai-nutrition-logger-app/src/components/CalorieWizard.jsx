import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ACTIVITY_LEVELS, GOAL_DIRECTIONS, GOAL_PACES, METRIC_BOUNDS,
  computeBMR, computeTDEE, computeGoal, computeMacros,
} from '../utils/calories';
import { useLang } from '../i18n/LanguageContext';
import CountUp from './CountUp';

const STEPS = ['SEX', 'METRICS', 'ACTIVITY', 'GOAL', 'RESULT'];

const slide = {
  enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

function inRange(value, bounds) {
  const n = Number(value);
  return Number.isFinite(n) && n >= bounds.min && n <= bounds.max;
}

function StepHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h3 className="text-2xl font-black font-headline uppercase tracking-tighter">{title}</h3>
      {subtitle && (
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function SelectCard({ selected, onClick, children, padding = 'p-5' }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`w-full border-2 border-black ${padding} text-left transition-all ${
        selected
          ? 'bg-secondary text-on-secondary shadow-none translate-x-0.5 translate-y-0.5'
          : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
      }`}
    >
      {children}
    </motion.button>
  );
}

function SexStep({ value, onSelect }) {
  const { t } = useLang();
  return (
    <div>
      <StepHeader title={t('wizard.sexTitle')} subtitle={t('wizard.sexSub')} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[{ k: 'MALE', l: t('wizard.male') }, { k: 'FEMALE', l: t('wizard.female') }].map((o) => (
          <SelectCard key={o.k} selected={value === o.k} onClick={() => onSelect(o.k)}>
            <span className="block text-lg sm:text-2xl font-black uppercase tracking-tight leading-tight break-words">{o.l}</span>
          </SelectCard>
        ))}
      </div>
    </div>
  );
}

function MetricsStep({ form, set }) {
  const { t } = useLang();
  const field = (label, key, unit, placeholder, bounds) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={form[key]}
          onChange={(e) => set({ [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-surface-container-low border-2 border-black p-4 pr-16 text-2xl font-black tracking-tighter focus:bg-white outline-none"
        />
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-black text-black/30 uppercase pointer-events-none">{unit}</span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">{t('wizard.range', { min: bounds.min, max: bounds.max, unit })}</span>
    </div>
  );
  return (
    <div>
      <StepHeader title={t('wizard.metricsTitle')} subtitle={t('wizard.metricsSub')} />
      <div className="space-y-4">
        {field(t('wizard.age'), 'age', t('wizard.unitYrs'), '30', METRIC_BOUNDS.age)}
        {field(t('wizard.height'), 'heightCm', 'cm', '180', METRIC_BOUNDS.heightCm)}
        {field(t('wizard.weight'), 'weightKg', 'kg', '80', METRIC_BOUNDS.weightKg)}
      </div>
    </div>
  );
}

function ActivityStep({ value, onSelect }) {
  const { t } = useLang();
  return (
    <div>
      <StepHeader title={t('wizard.activityTitle')} subtitle={t('wizard.activitySub')} />
      <div className="space-y-3">
        {ACTIVITY_LEVELS.map((l) => (
          <SelectCard key={l.key} selected={value === l.key} onClick={() => onSelect(l.key)}>
            <div className="flex justify-between items-center gap-2 sm:gap-3">
              <span className="min-w-0 text-sm sm:text-base font-black uppercase tracking-tight leading-tight break-words">{t(`wizard.activity.${l.key}.label`)}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 text-right shrink-0">{t(`wizard.activity.${l.key}.desc`)}</span>
            </div>
          </SelectCard>
        ))}
      </div>
    </div>
  );
}

function GoalStep({ form, set }) {
  const { t } = useLang();
  const paces = GOAL_PACES[form.direction] || [];
  return (
    <div>
      <StepHeader title={t('wizard.goalTitle')} subtitle={t('wizard.goalSub')} />
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        {GOAL_DIRECTIONS.map((d) => (
          <SelectCard key={d.key} padding="p-3 sm:p-4" selected={form.direction === d.key} onClick={() => { if (form.direction !== d.key) set({ direction: d.key, pace: '' }); }}>
            <span className="block text-center text-xs sm:text-sm font-black uppercase tracking-tight leading-tight break-words hyphens-auto">{t(`wizard.direction.${d.key}`)}</span>
          </SelectCard>
        ))}
      </div>
      <AnimatePresence>
        {paces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('wizard.pace')}</label>
            {paces.map((p) => (
              <SelectCard key={p.key} selected={form.pace === p.key} onClick={() => set({ pace: p.key })}>
                <div className="flex justify-between items-center gap-2 sm:gap-3">
                  <span className="min-w-0 text-sm sm:text-base font-black uppercase tracking-tight leading-tight break-words">{t(`wizard.paceOpt.${p.key}.label`)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 text-right shrink-0">{t(`wizard.paceOpt.${p.key}.desc`)}</span>
                </div>
              </SelectCard>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultStep({ result }) {
  const { t } = useLang();
  if (!result) {
    return <p className="text-sm font-bold uppercase tracking-widest">{t('wizard.completePrevious')}</p>;
  }
  const { goal, macros } = result;
  const bars = [
    { label: t('dashboard.protein'), g: macros.proteinG, pct: ((macros.proteinG * 4) / goal) * 100 },
    { label: t('dashboard.carbs'), g: macros.carbsG, pct: ((macros.carbsG * 4) / goal) * 100 },
    { label: t('dashboard.fats'), g: macros.fatsG, pct: ((macros.fatsG * 9) / goal) * 100 },
  ];
  return (
    <div className="text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">{t('wizard.dailyTarget')}</p>
      <div className="my-4 flex items-end justify-center gap-2">
        <span className="text-7xl font-black tracking-tighter"><CountUp value={goal} /></span>
        <span className="text-2xl font-black text-black/30 mb-2 uppercase">kcal</span>
      </div>
      <div className="space-y-3 mt-8 text-left">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
              <span>{b.label}</span><span>{b.g} g</span>
            </div>
            <div className="h-3 border-2 border-black bg-white">
              <motion.div
                className="h-full bg-black"
                initial={{ width: 0 }}
                animate={{ width: `${b.pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalorieWizard({
  initialValues = {}, onComplete, onSkip, saving = false, mode = 'onboarding',
}) {
  const { t } = useLang();
  const [stepIndex, setStepIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({
    sex: initialValues.sex || '',
    age: initialValues.age || '',
    heightCm: initialValues.height_cm || '',
    weightKg: initialValues.weight_kg || '',
    activityLevel: initialValues.activity_level || '',
    direction: initialValues.goal_direction || '',
    pace: initialValues.goal_pace || '',
  });

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    const hasData = initialValues && (
      initialValues.sex || initialValues.age || initialValues.height_cm ||
      initialValues.weight_kg || initialValues.activity_level || initialValues.goal_direction
    );
    if (!hasData) return;
    initialized.current = true;
    setForm({
      sex: initialValues.sex || '',
      age: initialValues.age || '',
      heightCm: initialValues.height_cm || '',
      weightKg: initialValues.weight_kg || '',
      activityLevel: initialValues.activity_level || '',
      direction: initialValues.goal_direction || '',
      pace: initialValues.goal_pace || '',
    });
  }, [initialValues]);

  const step = STEPS[stepIndex];

  const result = useMemo(() => {
    const { sex, age, heightCm, weightKg, activityLevel, direction, pace } = form;
    if (!sex || !age || !heightCm || !weightKg || !activityLevel || !direction) return null;
    const bmr = computeBMR({ sex, age: Number(age), heightCm: Number(heightCm), weightKg: Number(weightKg) });
    const tdee = computeTDEE(bmr, activityLevel);
    const goal = computeGoal({ tdee, sex, direction, pace: pace || null });
    return { goal, macros: computeMacros(goal) };
  }, [form]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const go = (delta) => {
    setDir(delta);
    setStepIndex((i) => Math.min(Math.max(i + delta, 0), STEPS.length - 1));
  };
  const startOver = () => {
    setDir(-1);
    setStepIndex(0);
  };

  const canAdvance = () => {
    switch (step) {
      case 'SEX': return !!form.sex;
      case 'METRICS': return inRange(form.age, METRIC_BOUNDS.age) && inRange(form.heightCm, METRIC_BOUNDS.heightCm) && inRange(form.weightKg, METRIC_BOUNDS.weightKg);
      case 'ACTIVITY': return !!form.activityLevel;
      case 'GOAL': return form.direction && (form.direction === 'MAINTAIN' || form.pace);
      default: return true;
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    onComplete({
      daily_calorie_goal: result.goal,
      sex: form.sex,
      age: Number(form.age),
      height_cm: Number(form.heightCm),
      weight_kg: Number(form.weightKg),
      activity_level: form.activityLevel,
      goal_direction: form.direction,
      goal_pace: form.direction === 'MAINTAIN' ? null : form.pace,
    });
  };

  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="h-2 border-2 border-black bg-white mb-8">
        <motion.div
          className="h-full bg-secondary"
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-8 min-h-[380px] flex flex-col">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="flex-grow"
          >
            {step === 'SEX' && <SexStep value={form.sex} onSelect={(sex) => set({ sex })} />}
            {step === 'METRICS' && <MetricsStep form={form} set={set} />}
            {step === 'ACTIVITY' && <ActivityStep value={form.activityLevel} onSelect={(activityLevel) => set({ activityLevel })} />}
            {step === 'GOAL' && <GoalStep form={form} set={set} />}
            {step === 'RESULT' && <ResultStep result={result} />}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between pt-8 mt-auto">
          <button
            onClick={() => go(-1)}
            disabled={stepIndex === 0}
            className="text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:underline underline-offset-4"
          >
            {t('wizard.back')}
          </button>

          {onSkip && stepIndex === 0 && (
            <button
              onClick={onSkip}
              className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:underline underline-offset-4"
            >
              {t('wizard.skip')}
            </button>
          )}

          {step !== 'RESULT' ? (
            <button
              onClick={() => go(1)}
              disabled={!canAdvance()}
              className="bg-black text-white py-3 px-8 border-2 border-black font-black text-xs tracking-widest uppercase active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-30"
            >
              {t('wizard.next')}
            </button>
          ) : mode === 'calculator' ? (
            <button
              onClick={startOver}
              className="bg-secondary text-on-secondary py-3 px-8 border-2 border-black font-black text-xs tracking-widest uppercase active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              {t('wizard.startOver')}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={saving || !result}
              className="bg-secondary text-on-secondary py-3 px-8 border-2 border-black font-black text-xs tracking-widest uppercase active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              {saving ? t('common.saving') : (mode === 'onboarding' ? t('wizard.startTracking') : t('wizard.saveGoal'))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
