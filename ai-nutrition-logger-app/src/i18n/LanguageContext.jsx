import { createContext, useContext, useCallback, useState, useMemo } from 'react';
import { translations } from './translations';

const STORAGE_KEY = 'ledger:lang';
const SUPPORTED = ['en', 'pl'];

const LanguageContext = createContext(null);

function readInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(browser)) return browser;
  } catch {
    /* localStorage unavailable — fall through to default */
  }
  return 'en';
}

// Resolve a dotted path ("dashboard.target") against a nested object.
function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function interpolate(value, vars) {
  if (typeof value !== 'string' || !vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    (name in vars ? String(vars[name]) : match));
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      /* ignore persistence errors */
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'pl' ? 'en' : 'pl');
  }, [lang, setLang]);

  // t() returns whatever lives at the path (string or array), with English
  // as the fallback so a missing Polish key never renders blank.
  const t = useCallback((path, vars) => {
    let value = resolvePath(translations[lang], path);
    if (value === undefined) value = resolvePath(translations.en, path);
    if (value === undefined) return path;
    return interpolate(value, vars);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
}
