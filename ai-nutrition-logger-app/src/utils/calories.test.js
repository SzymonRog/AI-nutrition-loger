import { describe, it, expect } from 'vitest';
import {
  computeBMR,
  computeTDEE,
  computeGoal,
  computeMacros,
  calculateDailyGoal,
  computeBMI,
  bmiCategory,
} from './calories';

describe('computeBMR (Mifflin-St Jeor)', () => {
  it('computes male BMR', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(computeBMR({ sex: 'MALE', age: 30, heightCm: 180, weightKg: 80 })).toBe(1780);
  });
  it('computes female BMR', () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 1345.25
    expect(computeBMR({ sex: 'FEMALE', age: 25, heightCm: 165, weightKg: 60 })).toBeCloseTo(1345.25);
  });
});

describe('computeTDEE', () => {
  it('applies the moderate multiplier', () => {
    expect(computeTDEE(1780, 'MODERATE')).toBeCloseTo(2759);
  });
  it('falls back to sedentary for unknown level', () => {
    expect(computeTDEE(1000, 'NOPE')).toBeCloseTo(1200);
  });
});

describe('computeGoal', () => {
  it('subtracts lose-moderate offset and rounds to nearest 10', () => {
    // 2759 - 500 = 2259 -> 2260
    expect(computeGoal({ tdee: 2759, sex: 'MALE', direction: 'LOSE', pace: 'MODERATE' })).toBe(2260);
  });
  it('returns tdee for maintain', () => {
    expect(computeGoal({ tdee: 2000, sex: 'MALE', direction: 'MAINTAIN', pace: null })).toBe(2000);
  });
  it('applies the female safety floor', () => {
    expect(computeGoal({ tdee: 1400, sex: 'FEMALE', direction: 'LOSE', pace: 'AGGRESSIVE' })).toBe(1200);
  });
  it('applies the male safety floor', () => {
    expect(computeGoal({ tdee: 1600, sex: 'MALE', direction: 'LOSE', pace: 'AGGRESSIVE' })).toBe(1500);
  });
});

describe('computeMacros', () => {
  it('splits 30/40/30 by calories', () => {
    expect(computeMacros(2000)).toEqual({ proteinG: 150, carbsG: 200, fatsG: 67 });
  });
});

describe('computeBMI', () => {
  it('computes BMI rounded to one decimal', () => {
    // 80 / (1.80^2) = 24.69... -> 24.7
    expect(computeBMI({ heightCm: 180, weightKg: 80 })).toBe(24.7);
  });
  it('returns 0 when height is missing', () => {
    expect(computeBMI({ heightCm: 0, weightKg: 80 })).toBe(0);
  });
});

describe('bmiCategory', () => {
  it('classifies the WHO bands', () => {
    expect(bmiCategory(17)).toBe('UNDERWEIGHT');
    expect(bmiCategory(22)).toBe('NORMAL');
    expect(bmiCategory(27)).toBe('OVERWEIGHT');
    expect(bmiCategory(31)).toBe('OBESE');
  });
  it('uses inclusive lower / exclusive upper boundaries', () => {
    expect(bmiCategory(18.5)).toBe('NORMAL');
    expect(bmiCategory(25)).toBe('OVERWEIGHT');
    expect(bmiCategory(30)).toBe('OBESE');
  });
});

describe('calculateDailyGoal', () => {
  it('runs the full pipeline', () => {
    const goal = calculateDailyGoal({
      sex: 'MALE', age: 30, heightCm: 180, weightKg: 80,
      activityLevel: 'MODERATE', direction: 'LOSE', pace: 'MODERATE',
    });
    expect(goal).toBe(2260);
  });
});
