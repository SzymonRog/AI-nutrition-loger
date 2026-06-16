import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { computeBMI, bmiCategory, METRIC_BOUNDS } from '../utils/calories';
import { useLang } from '../i18n/LanguageContext';
import CountUp from './CountUp';

// WHO band -> the position (in BMI units) where each colour segment starts.
// The meter is drawn across a fixed 15–40 window so the marker has room.
const SCALE_MIN = 15;
const SCALE_MAX = 40;

const BANDS = [
  { key: 'UNDERWEIGHT', from: SCALE_MIN, to: 18.5, color: 'bg-blue-400' },
  { key: 'NORMAL', from: 18.5, to: 25, color: 'bg-secondary' },
  { key: 'OVERWEIGHT', from: 25, to: 30, color: 'bg-amber-400' },
  { key: 'OBESE', from: 30, to: SCALE_MAX, color: 'bg-error' },
];

function inRange(value, bounds) {
  const n = Number(value);
  return Number.isFinite(n) && n >= bounds.min && n <= bounds.max;
}

export default function BmiCalculator() {
  const { t } = useLang();
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const validHeight = inRange(heightCm, METRIC_BOUNDS.heightCm);
  const validWeight = inRange(weightKg, METRIC_BOUNDS.weightKg);

  const result = useMemo(() => {
    if (!validHeight || !validWeight) return null;
    const bmi = computeBMI({ heightCm: Number(heightCm), weightKg: Number(weightKg) });
    return { bmi, category: bmiCategory(bmi) };
  }, [heightCm, weightKg, validHeight, validWeight]);

  // Where to drop the marker on the 15–40 meter (clamped to the ends).
  const markerPct = result
    ? ((Math.min(Math.max(result.bmi, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100
    : 0;

  const field = (label, value, onChange, placeholder, unit, bounds) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-surface-container-low border-2 border-black p-4 pr-16 text-2xl font-black tracking-tighter focus:bg-white outline-none"
        />
        <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-black text-black/30 uppercase pointer-events-none">{unit}</span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">{t('wizard.range', { min: bounds.min, max: bounds.max, unit })}</span>
    </div>
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-black font-headline uppercase tracking-tighter">{t('bmi.title')}</h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mt-1">{t('bmi.subtitle')}</p>
        </div>

        <div className="space-y-4">
          {field(t('wizard.height'), heightCm, setHeightCm, '180', 'cm', METRIC_BOUNDS.heightCm)}
          {field(t('wizard.weight'), weightKg, setWeightKg, '80', 'kg', METRIC_BOUNDS.weightKg)}
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8 text-center"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">{t('bmi.yourBmi')}</p>
            <div className="my-3 flex items-end justify-center gap-2">
              <span className="text-7xl font-black tracking-tighter"><CountUp value={result.bmi} decimals={1} /></span>
            </div>
            <span className="inline-block border-2 border-black bg-secondary text-on-secondary px-4 py-1 text-xs font-black uppercase tracking-widest">
              {t(`bmi.category.${result.category}`)}
            </span>

            {/* Colour-banded meter with a marker at the computed BMI. */}
            <div className="mt-8">
              <div className="relative h-4 border-2 border-black flex overflow-hidden">
                {BANDS.map((b) => (
                  <div
                    key={b.key}
                    className={b.color}
                    style={{ width: `${((b.to - b.from) / (SCALE_MAX - SCALE_MIN)) * 100}%` }}
                  />
                ))}
                <motion.div
                  className="absolute top-[-6px] h-[calc(100%+12px)] w-1 bg-black"
                  initial={{ left: 0 }}
                  animate={{ left: `${markerPct}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60 mt-2">
                <span>18.5</span><span>25</span><span>30</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
