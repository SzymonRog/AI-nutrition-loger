# Calorie Calculator Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a personalized, animated multi-step calorie-calculator wizard (Mifflin-St Jeor) shown at onboarding and editable on the Profile page, persisting biometric inputs in the backend.

**Architecture:** Pure calculation logic lives in a dependency-free frontend module (`utils/calories.js`), consumed by a reusable `CalorieWizard` component animated with Framer Motion. The FastAPI/SQLite backend gains nullable biometric columns on the `users` table (idempotent `ALTER TABLE` migrations), extended `UserProfile`/`UserProfileUpdate` schemas, and a widened `update_user_profile()` that preserves existing values via `COALESCE`.

**Tech Stack:** FastAPI, SQLite (sqlite3), Pydantic, React 19, React Router 7, Tailwind 3, Framer Motion, Vitest (new), pytest.

**Reference spec:** `docs/superpowers/specs/2026-06-15-calorie-calculator-wizard-design.md`

**Note on constant placement:** Activity multipliers and pace offsets live ONLY in the frontend `utils/calories.js` (where computation happens). The backend stores the chosen values and the resulting `daily_calorie_goal` but does not recompute, so its `constants.py` gains only enum lists + field bounds used for validation. This avoids dead/duplicated logic.

---

## File Structure

| File | Responsibility | Create/Modify |
| --- | --- | --- |
| `ai-nutrition-logger-api/src/config/constants.py` | Enum lists + field bounds for validation | Modify |
| `ai-nutrition-logger-api/src/services/db_service.py` | Migration + persist/read biometric fields | Modify |
| `ai-nutrition-logger-api/src/api/schemas.py` | Extend `UserProfile` + `UserProfileUpdate` | Modify |
| `ai-nutrition-logger-api/src/api/routes/users.py` | Pass new fields to db layer | Modify |
| `ai-nutrition-logger-api/tests/test_services/test_db_service.py` | DB persistence + migration tests | Modify |
| `ai-nutrition-logger-api/tests/test_api/test_users.py` | `PUT /users/me` validation + round-trip | Create |
| `ai-nutrition-logger-api/docs/*.md` | Doc updates | Modify |
| `ai-nutrition-logger-app/package.json` | Add framer-motion + vitest + test script | Modify |
| `ai-nutrition-logger-app/src/utils/calories.js` | Pure formula + UI metadata | Create |
| `ai-nutrition-logger-app/src/utils/calories.test.js` | Unit tests for calc | Create |
| `ai-nutrition-logger-app/src/components/CalorieWizard.jsx` | Animated multi-step wizard | Create |
| `ai-nutrition-logger-app/src/components/Onboarding.jsx` | Onboarding page wrapping wizard | Create |
| `ai-nutrition-logger-app/src/components/Auth.jsx` | Redirect to `/onboarding` after register | Modify |
| `ai-nutrition-logger-app/src/components/Profile.jsx` | Pre-filled wizard + manual override | Modify |
| `ai-nutrition-logger-app/src/App.jsx` | Add `/onboarding` route | Modify |

---

## Task 1: Backend constants (enums + bounds)

**Files:**
- Modify: `ai-nutrition-logger-api/src/config/constants.py`

- [ ] **Step 1: Append the new constants**

Add to the end of `src/config/constants.py`:

```python
# Calorie Calculator — biometric enums (validation source of truth)
SEXES = ["MALE", "FEMALE"]
ACTIVITY_LEVELS = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]
GOAL_DIRECTIONS = ["LOSE", "MAINTAIN", "GAIN"]
GOAL_PACES = ["MILD", "MODERATE", "AGGRESSIVE"]

# Calorie Calculator — biometric field bounds
AGE_MIN, AGE_MAX = 13, 120
HEIGHT_CM_MIN, HEIGHT_CM_MAX = 50, 250
WEIGHT_KG_MIN, WEIGHT_KG_MAX = 20, 400
```

- [ ] **Step 2: Verify the module imports cleanly**

Run: `cd ai-nutrition-logger-api && python -c "from src.config import constants; print(constants.SEXES, constants.AGE_MAX)"`
Expected: `['MALE', 'FEMALE'] 120`

- [ ] **Step 3: Commit**

```bash
git add ai-nutrition-logger-api/src/config/constants.py
git commit -m "feat(api): add biometric enums and bounds constants"
```

---

## Task 2: DB migration + widened update_user_profile

**Files:**
- Modify: `ai-nutrition-logger-api/src/services/db_service.py` (migration block near line 120; `update_user_profile` near line 217)
- Test: `ai-nutrition-logger-api/tests/test_services/test_db_service.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_services/test_db_service.py`:

```python
def test_update_user_profile_persists_biometrics(test_db_path):
    from src.services.db_service import DatabaseManager

    db = DatabaseManager(db_path=test_db_path)
    user_id = db.create_user(daily_calorie_goal=2000, email="bio@example.com")

    updated = db.update_user_profile(
        user_id,
        daily_calorie_goal=2300,
        sex="MALE",
        age=30,
        height_cm=180.0,
        weight_kg=80.0,
        activity_level="MODERATE",
        goal_direction="LOSE",
        goal_pace="MODERATE",
    )

    assert updated["daily_calorie_goal"] == 2300
    assert updated["sex"] == "MALE"
    assert updated["age"] == 30
    assert updated["height_cm"] == 180.0
    assert updated["weight_kg"] == 80.0
    assert updated["activity_level"] == "MODERATE"
    assert updated["goal_direction"] == "LOSE"
    assert updated["goal_pace"] == "MODERATE"


def test_update_user_profile_preserves_biometrics_on_goal_only_update(test_db_path):
    from src.services.db_service import DatabaseManager

    db = DatabaseManager(db_path=test_db_path)
    user_id = db.create_user(daily_calorie_goal=2000, email="keep@example.com")
    db.update_user_profile(
        user_id, daily_calorie_goal=2300, sex="FEMALE", age=25,
        height_cm=165.0, weight_kg=60.0, activity_level="LIGHT",
        goal_direction="MAINTAIN", goal_pace=None,
    )

    # Manual override: only the goal changes; biometrics must survive.
    updated = db.update_user_profile(user_id, daily_calorie_goal=1900)

    assert updated["daily_calorie_goal"] == 1900
    assert updated["sex"] == "FEMALE"
    assert updated["weight_kg"] == 60.0
    assert updated["activity_level"] == "LIGHT"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ai-nutrition-logger-api && python -m pytest tests/test_services/test_db_service.py::test_update_user_profile_persists_biometrics -v`
Expected: FAIL (`update_user_profile()` got an unexpected keyword argument `sex`, or KeyError on `sex`).

- [ ] **Step 3: Add the migration**

In `src/services/db_service.py`, immediately after the existing `meals` migration block (the `if 'meal_title' not in columns:` lines ending with `conn.commit()` around line 125), add:

```python
            # Migrations - Ensure biometric columns exist on users
            cursor.execute("PRAGMA table_info(users)")
            user_columns = [col[1] for col in cursor.fetchall()]
            for col_name, col_type in [
                ("sex", "TEXT"),
                ("age", "INTEGER"),
                ("height_cm", "REAL"),
                ("weight_kg", "REAL"),
                ("activity_level", "TEXT"),
                ("goal_direction", "TEXT"),
                ("goal_pace", "TEXT"),
            ]:
                if col_name not in user_columns:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            conn.commit()
```

- [ ] **Step 4: Widen `update_user_profile`**

Replace the entire `update_user_profile` method (lines ~217-241) with:

```python
    def update_user_profile(
        self,
        user_id: str,
        daily_calorie_goal: int,
        sex: Optional[str] = None,
        age: Optional[int] = None,
        height_cm: Optional[float] = None,
        weight_kg: Optional[float] = None,
        activity_level: Optional[str] = None,
        goal_direction: Optional[str] = None,
        goal_pace: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Updates the user's profile settings.

        Always updates daily_calorie_goal. Biometric fields are only overwritten
        when a non-None value is provided (COALESCE), so a goal-only manual
        override preserves previously saved biometrics.
        """
        now = datetime.now()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET daily_calorie_goal = ?,
                    sex = COALESCE(?, sex),
                    age = COALESCE(?, age),
                    height_cm = COALESCE(?, height_cm),
                    weight_kg = COALESCE(?, weight_kg),
                    activity_level = COALESCE(?, activity_level),
                    goal_direction = COALESCE(?, goal_direction),
                    goal_pace = COALESCE(?, goal_pace),
                    updated_at = ?
                WHERE id = ?
            """, (
                daily_calorie_goal, sex, age, height_cm, weight_kg,
                activity_level, goal_direction, goal_pace, now, user_id,
            ))
            conn.commit()

            if cursor.rowcount == 0:
                return None

        return self.get_user(user_id)
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd ai-nutrition-logger-api && python -m pytest tests/test_services/test_db_service.py -v`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 6: Commit**

```bash
git add ai-nutrition-logger-api/src/services/db_service.py ai-nutrition-logger-api/tests/test_services/test_db_service.py
git commit -m "feat(api): persist biometric fields with migration and COALESCE update"
```

---

## Task 3: Extend schemas + route

**Files:**
- Modify: `ai-nutrition-logger-api/src/api/schemas.py`
- Modify: `ai-nutrition-logger-api/src/api/routes/users.py`
- Test: `ai-nutrition-logger-api/tests/test_api/test_users.py` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/test_api/test_users.py`:

```python
"""Tests for the /users endpoints, including biometric profile updates."""


def _register_and_login(client, email="profile@example.com", password="password123"):
    client.post("/api/v1/auth/register", json={"email": email, "password": password})
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_update_profile_with_biometrics_roundtrips(isolated_client):
    headers = _register_and_login(isolated_client)
    payload = {
        "daily_calorie_goal": 2300,
        "sex": "MALE",
        "age": 30,
        "height_cm": 180.0,
        "weight_kg": 80.0,
        "activity_level": "MODERATE",
        "goal_direction": "LOSE",
        "goal_pace": "MODERATE",
    }
    resp = isolated_client.put("/api/v1/users/me", json=payload, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["daily_calorie_goal"] == 2300
    assert body["sex"] == "MALE"
    assert body["activity_level"] == "MODERATE"
    assert body["goal_pace"] == "MODERATE"

    # GET reflects the saved biometrics.
    me = isolated_client.get("/api/v1/users/me", headers=headers)
    assert me.json()["weight_kg"] == 80.0


def test_update_profile_rejects_bad_enum(isolated_client):
    headers = _register_and_login(isolated_client, email="bad@example.com")
    resp = isolated_client.put(
        "/api/v1/users/me",
        json={"daily_calorie_goal": 2000, "activity_level": "EXTREME"},
        headers=headers,
    )
    assert resp.status_code == 422


def test_update_profile_rejects_out_of_range_age(isolated_client):
    headers = _register_and_login(isolated_client, email="age@example.com")
    resp = isolated_client.put(
        "/api/v1/users/me",
        json={"daily_calorie_goal": 2000, "age": 5},
        headers=headers,
    )
    assert resp.status_code == 422


def test_update_profile_goal_only_still_works(isolated_client):
    headers = _register_and_login(isolated_client, email="goalonly@example.com")
    resp = isolated_client.put(
        "/api/v1/users/me",
        json={"daily_calorie_goal": 2500},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["daily_calorie_goal"] == 2500
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ai-nutrition-logger-api && python -m pytest tests/test_api/test_users.py -v`
Expected: FAIL (e.g. `test_update_profile_with_biometrics_roundtrips` returns `sex: None` because the schema drops the field; `test_update_profile_rejects_bad_enum` returns 200 instead of 422).

- [ ] **Step 3: Extend the schemas**

In `src/api/schemas.py`, update the imports from constants to add the new names:

```python
from src.config.constants import (
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    DEFAULT_DAILY_CALORIE_GOAL,
    CALORIE_GOAL_MIN,
    CALORIE_GOAL_MAX,
    MEAL_TEXT_MAX_LENGTH,
    MEAL_TYPES,
    SEXES,
    ACTIVITY_LEVELS,
    GOAL_DIRECTIONS,
    GOAL_PACES,
    AGE_MIN,
    AGE_MAX,
    HEIGHT_CM_MIN,
    HEIGHT_CM_MAX,
    WEIGHT_KG_MIN,
    WEIGHT_KG_MAX,
)
```

Replace the `UserProfile` and `UserProfileUpdate` classes with:

```python
class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    daily_calorie_goal: int
    sex: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: Optional[str] = None
    goal_direction: Optional[str] = None
    goal_pace: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    daily_calorie_goal: int = Field(..., ge=CALORIE_GOAL_MIN, le=CALORIE_GOAL_MAX)
    sex: Optional[str] = Field(None, pattern=f"^({'|'.join(SEXES)})$")
    age: Optional[int] = Field(None, ge=AGE_MIN, le=AGE_MAX)
    height_cm: Optional[float] = Field(None, ge=HEIGHT_CM_MIN, le=HEIGHT_CM_MAX)
    weight_kg: Optional[float] = Field(None, ge=WEIGHT_KG_MIN, le=WEIGHT_KG_MAX)
    activity_level: Optional[str] = Field(None, pattern=f"^({'|'.join(ACTIVITY_LEVELS)})$")
    goal_direction: Optional[str] = Field(None, pattern=f"^({'|'.join(GOAL_DIRECTIONS)})$")
    goal_pace: Optional[str] = Field(None, pattern=f"^({'|'.join(GOAL_PACES)})$")
```

- [ ] **Step 4: Pass fields through the route**

In `src/api/routes/users.py`, replace the `db.update_user_profile(...)` call inside `update_current_user_profile` with:

```python
    updated_user = db.update_user_profile(
        current_user["user_id"],
        profile_data.daily_calorie_goal,
        sex=profile_data.sex,
        age=profile_data.age,
        height_cm=profile_data.height_cm,
        weight_kg=profile_data.weight_kg,
        activity_level=profile_data.activity_level,
        goal_direction=profile_data.goal_direction,
        goal_pace=profile_data.goal_pace,
    )
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd ai-nutrition-logger-api && python -m pytest tests/test_api/test_users.py -v`
Expected: PASS (all four tests).

- [ ] **Step 6: Run the full backend suite for regressions**

Run: `cd ai-nutrition-logger-api && python -m pytest -q`
Expected: PASS (no regressions in auth/meals/services tests).

- [ ] **Step 7: Commit**

```bash
git add ai-nutrition-logger-api/src/api/schemas.py ai-nutrition-logger-api/src/api/routes/users.py ai-nutrition-logger-api/tests/test_api/test_users.py
git commit -m "feat(api): accept and validate biometric fields on PUT /users/me"
```

---

## Task 4: Update backend docs

**Files:**
- Modify: `ai-nutrition-logger-api/docs/DATABASE_SCHEMA.md`
- Modify: `ai-nutrition-logger-api/docs/API_DOCUMENTATION.md`

- [ ] **Step 1: Update the users table in DATABASE_SCHEMA.md**

In `docs/DATABASE_SCHEMA.md`, in the `### 1. users` table definition, add these rows after the `daily_calorie_goal` row:

```markdown
| `sex` | VARCHAR(10) | Nullable | `MALE` or `FEMALE`; used for BMR. |
| `age` | INT | Nullable | User age in years (13–120). |
| `height_cm` | REAL | Nullable | Height in centimetres (50–250). |
| `weight_kg` | REAL | Nullable | Weight in kilograms (20–400). |
| `activity_level` | VARCHAR(20) | Nullable | One of SEDENTARY, LIGHT, MODERATE, ACTIVE, VERY_ACTIVE. |
| `goal_direction` | VARCHAR(10) | Nullable | LOSE, MAINTAIN, or GAIN. |
| `goal_pace` | VARCHAR(15) | Nullable | MILD, MODERATE, or AGGRESSIVE (null for MAINTAIN). |
```

- [ ] **Step 2: Update the PUT /users/me request body in API_DOCUMENTATION.md**

In `docs/API_DOCUMENTATION.md`, under **5. Update User Settings**, replace the request body block with:

```json
{
  "daily_calorie_goal": 2500,
  "sex": "MALE",
  "age": 30,
  "height_cm": 180.0,
  "weight_kg": 80.0,
  "activity_level": "MODERATE",
  "goal_direction": "LOSE",
  "goal_pace": "MODERATE"
}
```

And add below it:

```markdown
All fields except `daily_calorie_goal` are optional. Omitted biometric fields keep their previously saved values (a goal-only update is a valid manual override). Enum and range validation returns `422` on invalid input.
```

- [ ] **Step 3: Commit**

```bash
git add ai-nutrition-logger-api/docs/DATABASE_SCHEMA.md ai-nutrition-logger-api/docs/API_DOCUMENTATION.md
git commit -m "docs(api): document biometric user fields and profile update payload"
```

---

## Task 5: Frontend deps + test runner

**Files:**
- Modify: `ai-nutrition-logger-app/package.json`

- [ ] **Step 1: Install runtime + dev dependencies**

Run:
```bash
cd ai-nutrition-logger-app && npm install framer-motion && npm install -D vitest
```
Expected: both packages added; `framer-motion` under `dependencies`, `vitest` under `devDependencies`.

- [ ] **Step 2: Add the test script**

In `ai-nutrition-logger-app/package.json`, add to the `"scripts"` object:

```json
    "test": "vitest run",
```

- [ ] **Step 3: Verify vitest runs (no tests yet is fine)**

Run: `cd ai-nutrition-logger-app && npx vitest run`
Expected: exits successfully reporting "No test files found" (or runs zero tests). This confirms the runner is wired.

- [ ] **Step 4: Commit**

```bash
git add ai-nutrition-logger-app/package.json ai-nutrition-logger-app/package-lock.json
git commit -m "chore(app): add framer-motion and vitest"
```

---

## Task 6: Pure calorie calculation module (TDD)

**Files:**
- Create: `ai-nutrition-logger-app/src/utils/calories.js`
- Test: `ai-nutrition-logger-app/src/utils/calories.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/calories.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  computeBMR,
  computeTDEE,
  computeGoal,
  computeMacros,
  calculateDailyGoal,
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

describe('calculateDailyGoal', () => {
  it('runs the full pipeline', () => {
    const goal = calculateDailyGoal({
      sex: 'MALE', age: 30, heightCm: 180, weightKg: 80,
      activityLevel: 'MODERATE', direction: 'LOSE', pace: 'MODERATE',
    });
    expect(goal).toBe(2260);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ai-nutrition-logger-app && npx vitest run src/utils/calories.test.js`
Expected: FAIL (cannot resolve `./calories` / functions undefined).

- [ ] **Step 3: Implement the module**

Create `src/utils/calories.js`:

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd ai-nutrition-logger-app && npx vitest run src/utils/calories.test.js`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add ai-nutrition-logger-app/src/utils/calories.js ai-nutrition-logger-app/src/utils/calories.test.js
git commit -m "feat(app): add pure Mifflin-St Jeor calorie calculation module"
```

---

## Task 7: CalorieWizard component

**Files:**
- Create: `ai-nutrition-logger-app/src/components/CalorieWizard.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/CalorieWizard.jsx`:

```jsx
import { useState, useMemo, useEffect } from 'react';
import {
  motion, AnimatePresence, animate, useMotionValue, useTransform,
} from 'framer-motion';
import {
  ACTIVITY_LEVELS, GOAL_DIRECTIONS, GOAL_PACES,
  computeBMR, computeTDEE, computeGoal, computeMacros,
} from '../utils/calories';

const STEPS = ['SEX', 'METRICS', 'ACTIVITY', 'GOAL', 'RESULT'];

const slide = {
  enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

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
  const field = (label, key, unit, placeholder) => (
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
    </div>
  );
  return (
    <div>
      <StepHeader title="Your Metrics" subtitle="Age, height and weight" />
      <div className="space-y-4">
        {field('Age', 'age', 'yrs', '30')}
        {field('Height', 'heightCm', 'cm', '180')}
        {field('Weight', 'weightKg', 'kg', '80')}
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
          <SelectCard key={d.key} selected={form.direction === d.key} onClick={() => set({ direction: d.key, pace: '' })}>
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
      case 'METRICS': return form.age && form.heightCm && form.weightKg;
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
```

- [ ] **Step 2: Verify the app builds with the new component**

Run: `cd ai-nutrition-logger-app && npm run build`
Expected: build succeeds (no import/syntax errors). The component is not yet routed; this only checks it compiles.

- [ ] **Step 3: Commit**

```bash
git add ai-nutrition-logger-app/src/components/CalorieWizard.jsx
git commit -m "feat(app): add animated CalorieWizard component"
```

---

## Task 8: Onboarding route + post-register redirect

**Files:**
- Create: `ai-nutrition-logger-app/src/components/Onboarding.jsx`
- Modify: `ai-nutrition-logger-app/src/App.jsx`
- Modify: `ai-nutrition-logger-app/src/components/Auth.jsx`

- [ ] **Step 1: Create the Onboarding page**

Create `src/components/Onboarding.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CalorieWizard from './CalorieWizard';
import { authService } from '../api/client';

export default function Onboarding() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleComplete = async (payload) => {
    setSaving(true);
    setError('');
    try {
      await authService.updateProfile(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-12">
      <header className="text-center mb-10 space-y-3">
        <h1 className="text-3xl font-black font-headline uppercase tracking-tighter">Set Your Target</h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">
          Personalize your daily calorie budget
        </p>
      </header>
      <CalorieWizard
        mode="onboarding"
        onComplete={handleComplete}
        onSkip={() => navigate('/')}
        saving={saving}
      />
      {error && (
        <p className="mt-6 text-error font-bold text-[10px] uppercase tracking-widest">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the route**

In `src/App.jsx`, add the import near the other component imports:

```jsx
import Onboarding from './components/Onboarding';
```

Then add this route inside `<Routes>`, after the `/auth` route and before the `/` route:

```jsx
      <Route path="/onboarding" element={
        <PrivateRoute>
          <Onboarding />
        </PrivateRoute>
      } />
```

- [ ] **Step 3: Redirect to onboarding after registration**

In `src/components/Auth.jsx`, replace the `handleSubmit` try-block body with:

```jsx
      if (isLogin) {
        await authService.login(email, password);
        navigate('/');
      } else {
        await authService.register(email, password);
        await authService.login(email, password); // auto login
        navigate('/onboarding');
      }
```

(Remove the now-duplicate `navigate('/')` that was after the if/else.)

- [ ] **Step 4: Verify the build**

Run: `cd ai-nutrition-logger-app && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add ai-nutrition-logger-app/src/components/Onboarding.jsx ai-nutrition-logger-app/src/App.jsx ai-nutrition-logger-app/src/components/Auth.jsx
git commit -m "feat(app): route new users to calorie onboarding after register"
```

---

## Task 9: Profile integration (pre-filled wizard + manual override)

**Files:**
- Modify: `ai-nutrition-logger-app/src/components/Profile.jsx` (full replacement)

- [ ] **Step 1: Replace Profile.jsx**

Replace the entire contents of `src/components/Profile.jsx` with:

```jsx
import { useState, useEffect } from 'react';
import { authService } from '../api/client';
import { useNavigate } from 'react-router-dom';
import CalorieWizard from './CalorieWizard';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [manualGoal, setManualGoal] = useState('');
  const [showManual, setShowManual] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    authService.getCurrentUser()
      .then((data) => { setUser(data); setManualGoal(data.daily_calorie_goal); })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleComplete = async (payload) => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const updated = await authService.updateProfile(payload);
      setUser(updated);
      setManualGoal(updated.daily_calorie_goal);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualGoal || isNaN(manualGoal)) {
      setError('Please enter a valid number');
      return;
    }
    await handleComplete({ daily_calorie_goal: parseInt(manualGoal) });
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth');
  };

  if (loading) {
    return <div className="p-6 text-center font-bold text-xs uppercase tracking-widest">Accessing Profile...</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <section>
        <h2 className="text-4xl font-black font-headline tracking-tighter uppercase border-b-4 border-black inline-block mb-3">Settings</h2>
        <p className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-[0.3em]">Recalculate your daily budget</p>
      </section>

      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Account Email</label>
        <div className="text-xl font-bold border-b-2 border-black/10 pb-2">{user?.email}</div>
        <div className="pt-4 flex items-baseline gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Current Goal:</span>
          <span className="text-2xl font-black">{user?.daily_calorie_goal} <span className="text-sm text-black/30">KCAL</span></span>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border-2 border-error p-4 flex items-center gap-3 text-error font-bold text-[10px] uppercase tracking-widest">
          <span className="material-symbols-outlined">report</span>{error}
        </div>
      )}
      {success && (
        <div className="bg-secondary/10 border-2 border-secondary p-4 flex items-center gap-3 text-secondary font-bold text-[10px] uppercase tracking-widest">
          <span className="material-symbols-outlined">check_circle</span>Changes saved to your record
        </div>
      )}

      <CalorieWizard
        mode="profile"
        initialValues={user}
        onComplete={handleComplete}
        saving={saving}
      />

      <div className="border-2 border-black/10 p-6">
        <button
          onClick={() => setShowManual((v) => !v)}
          className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:underline underline-offset-4"
        >
          {showManual ? '— Hide manual override' : '+ Manual override'}
        </button>
        {showManual && (
          <div className="mt-4 flex gap-3">
            <input
              type="number"
              value={manualGoal}
              onChange={(e) => setManualGoal(e.target.value)}
              className="flex-grow bg-surface-container-low border-2 border-black p-4 text-2xl font-black tracking-tighter outline-none"
            />
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="bg-black text-white px-6 border-2 border-black font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="pt-4 flex flex-col items-center gap-6">
        <button
          onClick={handleLogout}
          className="text-xs font-black uppercase tracking-[0.3em] text-error hover:underline decoration-2 underline-offset-8"
        >
          Sign Out of Ledger
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `cd ai-nutrition-logger-app && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add ai-nutrition-logger-app/src/components/Profile.jsx
git commit -m "feat(app): embed pre-filled calorie wizard and manual override on Profile"
```

---

## Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd ai-nutrition-logger-app && npm test`
Expected: PASS (calories tests).

- [ ] **Step 2: Run the full backend test suite**

Run: `cd ai-nutrition-logger-api && python -m pytest -q`
Expected: PASS (all tests).

- [ ] **Step 3: Manual smoke test (with API + app running)**

Start the API and app, then verify:
1. Register a new account → redirected to `/onboarding`.
2. Complete the wizard → number counts up on the result screen → "Start Tracking" → land on dashboard with the computed goal.
3. Register another account → on `/onboarding` click "Skip for now" → dashboard shows default 2000 goal.
4. Go to Profile → wizard is pre-filled with saved biometrics; re-run it → goal updates; success banner shows.
5. Profile → "Manual override" → change number → Save → goal updates and biometrics are preserved (re-open wizard to confirm pre-fill still present).

Expected: all five flows behave as described.

- [ ] **Step 4: Final commit (if any doc/touchups remain)**

```bash
git add -A
git commit -m "chore: calorie calculator wizard verification touchups" || echo "nothing to commit"
```

---

## Self-Review Notes

- **Spec coverage:** calculation (Task 6) · backend persistence/migration (Tasks 1–3) · schemas+route (Task 3) · docs (Task 4) · Framer Motion + wizard (Tasks 5,7) · onboarding optional skip (Task 8) · profile pre-fill + manual override (Task 9) · macro split result (Task 7) · animations: step transitions, progress bar, selection press, count-up, macro bars (Task 7). All spec sections map to a task.
- **Type/name consistency:** payload keys (`daily_calorie_goal`, `sex`, `age`, `height_cm`, `weight_kg`, `activity_level`, `goal_direction`, `goal_pace`) are identical across `update_user_profile`, `UserProfileUpdate`, route, wizard `handleConfirm`, Onboarding, and Profile. `initialValues` reads the snake_case fields returned by `get_user`/`UserProfile`. Calc functions (`computeBMR/TDEE/Goal/Macros`, `calculateDailyGoal`) match between module, tests, and wizard.
- **Out of scope (unchanged):** imperial units, persisted macros, Katch-McArdle, stat re-prompts.
