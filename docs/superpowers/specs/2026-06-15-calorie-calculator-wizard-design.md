# Calorie Calculator Wizard — Design Spec

**Date:** 2026-06-15
**Project:** AI Nutrition Logger (API + App)
**Status:** Approved

## Goal

Add a personalized daily-calorie calculator to the AI Nutrition Logger. The user
enters biometric and lifestyle data (sex, age, height, weight, activity level,
weight goal and pace), and the app computes a recommended `daily_calorie_goal`
using the Mifflin-St Jeor formula. The calculator appears as an animated
multi-step wizard during onboarding (after registration) and is editable on the
Profile page with previously saved values pre-filled. Biometric data is persisted
in the backend so it survives across devices and sessions.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Data storage | Persist biometrics in backend (users table) |
| Formula | Mifflin-St Jeor (BMR) × activity multiplier (TDEE) |
| Goal adjustment | User-selectable pace (Mild / Moderate / Aggressive) |
| Form layout | Multi-step animated wizard, used in both register & profile |
| Units | Metric only (kg / cm) |
| Registration flow | Optional — wizard can be skipped (falls back to default 2000) |
| Animation | Framer Motion |

## 1. Calculation Logic

New pure module: `ai-nutrition-logger-app/src/utils/calories.js`. Pure, testable
functions with no React/DOM dependencies, reused for live preview and final
submission.

### BMR — Mifflin-St Jeor

- Male:   `10·kg + 6.25·cm − 5·age + 5`
- Female: `10·kg + 6.25·cm − 5·age − 161`

### TDEE — activity multiplier

`TDEE = BMR × multiplier`

| Activity level | Key | Multiplier | Description |
| --- | --- | --- | --- |
| Sedentary | `SEDENTARY` | 1.2 | Little/no exercise |
| Light | `LIGHT` | 1.375 | 1–3 days/week |
| Moderate | `MODERATE` | 1.55 | 3–5 days/week |
| Active | `ACTIVE` | 1.725 | 6–7 days/week |
| Very Active | `VERY_ACTIVE` | 1.9 | Hard training / physical job |

### Goal adjustment — selectable pace

`goal = TDEE + offset`

| Direction | Key | Pace | Offset (kcal/day) |
| --- | --- | --- | --- |
| Lose | `LOSE` | Mild | −250 |
| Lose | `LOSE` | Moderate | −500 |
| Lose | `LOSE` | Aggressive | −750 |
| Maintain | `MAINTAIN` | — | 0 |
| Gain | `GAIN` | Mild | +250 |
| Gain | `GAIN` | Moderate | +500 |

### Safety & clamping

1. Apply a calorie floor: `1200` (female) / `1500` (male).
2. Clamp to the API's accepted range `CALORIE_GOAL_MIN`=500 … `CALORIE_GOAL_MAX`=10000.
3. Round the final goal to the nearest 10.

### Macro split (result screen)

Default split applied to the final calorie goal for display on the result screen:
- Protein 30% (4 kcal/g)
- Carbs 40% (4 kcal/g)
- Fats 30% (9 kcal/g)

Displayed as grams alongside the calorie number. Informational only — not
persisted in this iteration.

### Exported functions (sketch)

```js
export function computeBMR({ sex, age, heightCm, weightKg }): number
export function computeTDEE(bmr, activityLevel): number
export function computeGoal({ tdee, sex, direction, pace }): number   // floored, clamped, rounded
export function computeMacros(calories): { proteinG, carbsG, fatsG }
export const ACTIVITY_LEVELS, GOAL_DIRECTIONS, GOAL_PACES               // metadata for the UI
```

## 2. Backend Persistence (FastAPI + SQLite)

### New `users` columns (all nullable)

| Column | Type | Notes |
| --- | --- | --- |
| `sex` | TEXT | `MALE` / `FEMALE` |
| `age` | INTEGER | 13–120 |
| `height_cm` | REAL | 50–250 |
| `weight_kg` | REAL | 20–400 |
| `activity_level` | TEXT | one of the activity keys |
| `goal_direction` | TEXT | `LOSE` / `MAINTAIN` / `GAIN` |
| `goal_pace` | TEXT | `MILD` / `MODERATE` / `AGGRESSIVE` / null |

`daily_calorie_goal` continues to hold the computed result (unchanged).

### `db_service.py`

- In `_init_db` (or equivalent), after the `CREATE TABLE` block, add idempotent
  migrations following the existing `meal_title` pattern:
  `PRAGMA table_info(users)` → `ALTER TABLE users ADD COLUMN …` for each missing
  column.
- Extend `update_user_profile()` to accept the new optional fields and update them
  in a single `UPDATE` (only set fields that are provided).
- Ensure `get_user()` selects and returns the new columns.

### `constants.py`

Add: `ACTIVITY_MULTIPLIERS` map, `GOAL_PACE_OFFSETS` map, enum lists
(`SEXES`, `ACTIVITY_LEVELS`, `GOAL_DIRECTIONS`, `GOAL_PACES`), and field bounds
(`AGE_MIN/MAX`, `HEIGHT_CM_MIN/MAX`, `WEIGHT_KG_MIN/MAX`).

### `schemas.py`

- Extend `UserProfile` (response) with the new optional fields.
- Extend `UserProfileUpdate` (request) with the new optional fields + validation
  (`ge/le` bounds, enum `pattern`s). `daily_calorie_goal` remains required.

### `routes/users.py`

- `update_current_user_profile` passes the new fields through to
  `db.update_user_profile(...)`.
- **No change** to `/auth/register` — it stays email + password + `daily_calorie_goal`.

### Docs

Update `DATABASE_SCHEMA.md`, `API_DOCUMENTATION.md`, and `DB_SERVICE_GUIDE.md` to
reflect the new user fields and the extended `PUT /users/me` payload.

## 3. Frontend Flow

### Dependency

Add `framer-motion` to `ai-nutrition-logger-app/package.json`.

### Shared component: `src/components/CalorieWizard.jsx`

A reusable multi-step wizard. Props: `initialValues` (for pre-fill), `onComplete(profilePayload)`,
`onSkip` (optional), `mode` (`onboarding` | `profile`).

Steps:
1. **Sex** — two large selectable cards (Male / Female).
2. **Body metrics** — age, height (cm), weight (kg) inputs.
3. **Activity** — five selectable activity cards.
4. **Goal & pace** — Lose / Maintain / Gain, then pace (hidden for Maintain).
5. **Result reveal** — animated calorie count-up + macro bars + confirm/save.

State is local to the wizard; on completion it builds the profile payload
(biometrics + computed `daily_calorie_goal`) and calls `onComplete`, which issues
`authService.updateProfile(payload)` (the client call is already generic).

### Registration / onboarding

- `Auth.jsx`: after successful `register` + auto-login, navigate to a new
  `/onboarding` route instead of `/`.
- New route `/onboarding` in `App.jsx` (inside `PrivateRoute`) renders
  `CalorieWizard` in `onboarding` mode with a **"Skip for now"** action. Skip →
  navigate to `/` keeping the default 2000 goal. Complete → PUT profile → `/`.

### Profile page (`Profile.jsx`)

- Replace the bare number input with the pre-filled `CalorieWizard` in `profile`
  mode (loads current biometrics from `getCurrentUser`).
- Keep a small **manual override** affordance (edit the raw `daily_calorie_goal`
  directly) for power users who don't want to re-run the wizard.

### `client.js`

No structural change required — `updateProfile(data)` already PUTs an arbitrary
object to `/users/me`. New fields flow through automatically.

## 4. Animations (Framer Motion)

Preserve the existing Neo-Brutalist aesthetic (hard 4px shadows, 2px black
borders, uppercase tracking).

- **Step transitions:** `AnimatePresence` with slide + fade; directional based on
  next/back.
- **Progress indicator:** a top bar that fills per completed step (animated width).
- **Selection cards:** tap-scale + the existing hard-shadow "press"
  (`active:translate` + `shadow-none`) for selected state.
- **Result reveal:** calorie number count-up (animated from current goal → new
  goal) and macro bars growing to width on mount.

## Components & Boundaries

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `utils/calories.js` | Pure formula + metadata | nothing |
| `CalorieWizard.jsx` | Step UI, local state, animations | calories.js, framer-motion |
| `/onboarding` route | Wizard in onboarding mode + skip | CalorieWizard, client |
| `Profile.jsx` | Wizard in profile mode + manual override | CalorieWizard, client |
| `schemas.py` / `routes/users.py` | Validate + route profile fields | constants.py |
| `db_service.py` | Migrate + persist + read fields | sqlite |

## Testing

- **Unit (frontend):** `calories.js` — BMR/TDEE/goal/clamp/floor/macros across
  male/female, each activity level, each pace, and boundary values.
- **Backend:** `update_user_profile` round-trips the new fields; migration adds
  columns to a pre-existing DB without data loss; `PUT /users/me` validation
  rejects out-of-range values and bad enums.
- **Manual:** onboarding skip path keeps default goal; profile pre-fill loads
  saved values; result number matches manual formula computation.

## Out of Scope (YAGNI)

- Imperial units.
- Persisting macro targets (display-only this iteration).
- Body-fat / lean-mass formulas (Katch-McArdle).
- Re-prompting users to update stats over time.
