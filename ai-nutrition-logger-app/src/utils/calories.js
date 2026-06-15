// Pure calorie calculation utilities (Mifflin-St Jeor). No React/DOM deps.

export const ACTIVITY_LEVELS = [
  { key: 'SEDENTARY', label: 'Sedentary', desc: 'Little or no exercise', multiplier: 1.2 },
  { key: 'LIGHT', label: 'Light', desc: '1–3 days / week', multiplier: 1.375 },
  { key: 'MODERATE', label: 'Moderate', desc: '3–5 days / week', multiplier: 1.55 },
  { key: 'ACTIVE', label: 'Active', desc: '6–7 days / week', multiplier: 1.725 },
  { key: 'VERY_ACTIVE', label: 'Very Active', desc: 'Hard training / job', multiplier: 1.9 },
];

export const GOAL_DIRECTIONS = [
  { key: 'LOSE', label: 'Lose Weight' },
  { key: 'MAINTAIN', label: 'Maintain' },
  { key: 'GAIN', label: 'Gain Weight' },
];

export const GOAL_PACES = {
  LOSE: [
    { key: 'MILD', label: 'Mild', desc: '~0.25 kg / week', offset: -250 },
    { key: 'MODERATE', label: 'Moderate', desc: '~0.5 kg / week', offset: -500 },
    { key: 'AGGRESSIVE', label: 'Aggressive', desc: '~0.75 kg / week', offset: -750 },
  ],
  GAIN: [
    { key: 'MILD', label: 'Mild', desc: '~0.25 kg / week', offset: 250 },
    { key: 'MODERATE', label: 'Moderate', desc: '~0.5 kg / week', offset: 500 },
  ],
  MAINTAIN: [],
};

export const CALORIE_GOAL_MIN = 500;
export const CALORIE_GOAL_MAX = 10000;

export const METRIC_BOUNDS = {
  age: { min: 13, max: 120 },
  heightCm: { min: 50, max: 250 },
  weightKg: { min: 20, max: 400 },
};

export function computeBMR({ sex, age, heightCm, weightKg }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'MALE' ? base + 5 : base - 161;
}

export function computeTDEE(bmr, activityLevel) {
  const level = ACTIVITY_LEVELS.find((l) => l.key === activityLevel);
  const multiplier = level ? level.multiplier : 1.2;
  return bmr * multiplier;
}

export function paceOffset(direction, pace) {
  if (direction === 'MAINTAIN') return 0;
  const options = GOAL_PACES[direction] || [];
  const match = options.find((p) => p.key === pace);
  return match ? match.offset : 0;
}

export function computeGoal({ tdee, sex, direction, pace }) {
  const raw = tdee + paceOffset(direction, pace);
  const floor = sex === 'FEMALE' ? 1200 : 1500;
  const floored = Math.max(raw, floor);
  const clamped = Math.min(Math.max(floored, CALORIE_GOAL_MIN), CALORIE_GOAL_MAX);
  return Math.round(clamped / 10) * 10;
}

export function computeMacros(calories) {
  return {
    proteinG: Math.round((calories * 0.30) / 4),
    carbsG: Math.round((calories * 0.40) / 4),
    fatsG: Math.round((calories * 0.30) / 9),
  };
}

// Convenience: full pipeline from raw inputs (Numbers) to a goal value.
export function calculateDailyGoal({ sex, age, heightCm, weightKg, activityLevel, direction, pace }) {
  const bmr = computeBMR({ sex, age, heightCm, weightKg });
  const tdee = computeTDEE(bmr, activityLevel);
  return computeGoal({ tdee, sex, direction, pace });
}
