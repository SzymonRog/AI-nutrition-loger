// Client-side cache for the Daily Ledger so the Home page shows the last known
// state instantly when the user navigates back, then refreshes from the server
// (stale-while-revalidate). Safe no-ops if localStorage is unavailable.

const MEALS_PREFIX = 'ledger:meals:';
const USER_KEY = 'ledger:user';

export function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or privacy mode — ignore */
  }
}

export function getCachedMeals(date) {
  return safeGet(MEALS_PREFIX + date);
}

export function setCachedMeals(date, data) {
  safeSet(MEALS_PREFIX + date, data);
  pruneOldMealCaches(date);
}

// Keep only today's meal cache around; drop yesterday's leftovers.
function pruneOldMealCaches(keepDate) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(MEALS_PREFIX) && key !== MEALS_PREFIX + keepDate) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

export function getCachedUser() {
  return safeGet(USER_KEY);
}

export function setCachedUser(user) {
  safeSet(USER_KEY, user);
}
