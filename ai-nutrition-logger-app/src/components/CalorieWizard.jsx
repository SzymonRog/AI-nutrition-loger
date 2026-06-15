import { useState, useMemo, useEffect, useRef } from 'react';
import {
  motion, AnimatePresence, animate, useMotionValue, useTransform,
} from 'framer-motion';
import {
  ACTIVITY_LEVELS, GOAL_DIRECTIONS, GOAL_PACES, METRIC_BOUNDS,
  computeBMR, computeTDEE, computeGoal, computeMacros,
} from '../utils/calories';

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

function SelectCard({ selected, onClick, children }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`w-full border-2 border-black p-5 text-left transition-all ${
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
  return (
    <div>
      <StepHeader title="Biological Sex" subtitle="Used for the BMR formula" />
      <div className="grid grid-cols-2 gap-4">
        {[{ k: 'MALE', l: 'Male' }, { k: 'FEMALE', l: 'Female' }].map((o) => (
          <SelectCard key={o.k} selected={value === o.k} onClick={() => onSelect(o.k)}>
            <span className="text-2xl font-black uppercase tracking-tighter">{o.l}</span>
          </SelectCard>
        ))}
      </div>
    </div>
  );
}

function MetricsStep({ form, set }) {
  const field = (label, key, unit, placeholder, bounds) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={form[key]}
          onChange={(e) => set({ [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-surface-container-low border-2 border-black p-4 text-2xl font-black tracking-tighter focus:bg-white outline-none"
        />
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-black text-black/30 uppercase pointer-events-none">{unit}</span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Range: {bounds.min}–{bounds.max} {unit}</span>
    </div>
  );
  return (
    <div>
      <StepHeader title="Your Metrics" subtitle="Age, height and weight" />
      <div className="space-y-4">
        {field('Age', 'age', 'yrs', '30', METRIC_BOUNDS.age)}
        {field('Height', 'heightCm', 'cm', '180', METRIC_BOUNDS.heightCm)}
        {field('Weight', 'weightKg', 'kg', '80', METRIC_BOUNDS.weightKg)}
      </div>
    </div>
  );
}

function ActivityStep({ value, onSelect }) {
  return (
    <div>
      <StepHeader title="Activity Level" subtitle="How often do you train?" />
      <div className="space-y-3">
        {ACTIVITY_LEVELS.map((l) => (
          <SelectCard key={l.key} selected={value === l.key} onClick={() => onSelect(l.key)}>
            <div className="flex justify-between items-center">
              <span className="text-base font-black uppercase tracking-tight">{l.label}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{l.desc}</span>
            </div>
          </SelectCard>
        ))}
      </div>
    </div>
  );
}

function GoalStep({ form, set }) {
  const paces = GOAL_PACES[form.direction] || [];
  return (
    <div>
      <StepHeader title="Your Goal" subtitle="Pick a direction and pace" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        {GOAL_DIRECTIONS.map((d) => (
          <SelectCard key={d.key} selected={form.direction === d.key} onClick={() => { if (form.direction !== d.key) set({ direction: d.key, pace: '' }); }}>
            <span className="text-sm font-black uppercase tracking-tight">{d.label}</span>
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
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Pace</label>
            {paces.map((p) => (
              <SelectCard key={p.key} selected={form.pace === p.key} onClick={() => set({ pace: p.key })}>
                <div className="flex justify-between items-center">
                  <span className="text-base font-black uppercase tracking-tight">{p.label}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{p.desc}</span>
                </div>
              </SelectCard>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountUp({ value }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.0, ease: 'easeOut' });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

function ResultStep({ result }) {
  if (!result) {
    return <p className="text-sm font-bold uppercase tracking-widest">Complete previous steps...</p>;
  }
  const { goal, macros } = result;
  const bars = [
    { label: 'Protein', g: macros.proteinG, pct: ((macros.proteinG * 4) / goal) * 100 },
    { label: 'Carbs', g: macros.carbsG, pct: ((macros.carbsG * 4) / goal) * 100 },
    { label: 'Fats', g: macros.fatsG, pct: ((macros.fatsG * 9) / goal) * 100 },
  ];
  return (
    <div className="text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">Your Daily Target</p>
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

      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 min-h-[380px] flex flex-col">
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
            Back
          </button>

          {onSkip && stepIndex === 0 && (
            <button
              onClick={onSkip}
              className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:underline underline-offset-4"
            >
              Skip for now
            </button>
          )}

          {step !== 'RESULT' ? (
            <button
              onClick={() => go(1)}
              disabled={!canAdvance()}
              className="bg-black text-white py-3 px-8 border-2 border-black font-black text-xs tracking-widest uppercase active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-30"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={saving || !result}
              className="bg-secondary text-on-secondary py-3 px-8 border-2 border-black font-black text-xs tracking-widest uppercase active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              {saving ? 'Saving...' : (mode === 'onboarding' ? 'Start Tracking' : 'Save Goal')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
