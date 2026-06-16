import { motion } from 'framer-motion';
import { useLang } from '../i18n/LanguageContext';

const OPTIONS = ['en', 'pl'];

// Compact PL/EN switch in the app's high-contrast style. The active pill slides
// between the two labels via a shared layoutId so nothing jumps on toggle.
export default function LangToggle({ className = '' }) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={`inline-flex items-center border-2 border-black bg-white select-none ${className}`}
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className="relative px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 bg-black"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${active ? 'text-white' : 'text-black'}`}>
              {code}
            </span>
          </button>
        );
      })}
    </div>
  );
}
