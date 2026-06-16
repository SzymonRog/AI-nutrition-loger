import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CalorieWizard from './CalorieWizard';
import BmiCalculator from './BmiCalculator';
import LangToggle from './LangToggle';
import { useLang } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabaseClient';

const TABS = ['CALORIE', 'BMI'];

export default function Calculator() {
  const { t } = useLang();
  const [tab, setTab] = useState('CALORIE');
  const [showInfo, setShowInfo] = useState(false);
  // No account required, but a logged-in visitor should land back in the app.
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setLoggedIn(!!data.session);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between">
        <Link
          to={loggedIn ? '/' : '/auth'}
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-secondary transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {loggedIn ? t('calculator.backToApp') : t('calculator.backToLogin')}
        </Link>
        <LangToggle />
      </div>

      <div className="flex-grow flex flex-col items-center justify-center py-8">
        <header className="text-center mb-8 space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tighter">{t('calculator.title')}</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">{t('calculator.subtitle')}</p>
        </header>

        {/* Tab switch between the two calculators. */}
        <div className="w-full max-w-xl mx-auto mb-8 grid grid-cols-2 gap-3">
          {TABS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-2 border-black py-3 font-black text-xs uppercase tracking-widest transition-all ${
                tab === key
                  ? 'bg-secondary text-on-secondary translate-x-0.5 translate-y-0.5 shadow-none'
                  : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              {t(`calculator.tab.${key}`)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="w-full"
          >
            {tab === 'CALORIE'
              ? <CalorieWizard mode="calculator" />
              : <BmiCalculator />}
          </motion.div>
        </AnimatePresence>

        {/* Collapsible explanation of the maths behind each calculator. */}
        <div className="w-full max-w-xl mx-auto mt-8">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:underline underline-offset-4"
          >
            {showInfo ? t('calculator.hideInfo') : t('calculator.showInfo')}
          </button>
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 border-2 border-black/10 p-5 space-y-4 text-xs leading-relaxed text-on-surface-variant">
                  <div>
                    <p className="font-black uppercase tracking-widest text-on-surface mb-1">{t('calculator.info.calorieTitle')}</p>
                    <p>{t('calculator.info.calorieBody')}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-widest text-on-surface mb-1">{t('calculator.info.bmiTitle')}</p>
                    <p>{t('calculator.info.bmiBody')}</p>
                  </div>
                  <p className="text-[10px] italic">{t('calculator.info.disclaimer')}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
