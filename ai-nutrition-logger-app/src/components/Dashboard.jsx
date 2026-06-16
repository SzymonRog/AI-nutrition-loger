import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { mealService, authService } from '../api/client';
import { getMealIcon } from '../constants/mealTypeIcons';
import { useLang } from '../i18n/LanguageContext';
import CountUp from './CountUp';
import {
  staggerContainer, fadeUp, popIn, modalBackdrop, modalPanel,
} from '../utils/motionPresets';
import {
  todayKey, getCachedMeals, setCachedMeals, getCachedUser, setCachedUser,
} from '../utils/ledgerCache';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const dateKey = todayKey();

  // Hydrate from cache synchronously so returning to Home shows the last known
  // ledger immediately instead of a spinner.
  const [data, setData] = useState(() => getCachedMeals(dateKey));
  const [user, setUser] = useState(() => getCachedUser());
  const [loading, setLoading] = useState(() => getCachedMeals(dateKey) === null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const u = await authService.getCurrentUser();
        if (!active) return;
        setUser(u);
        setCachedUser(u);

        const result = await mealService.getMealsByDate(dateKey);
        if (!active) return;
        setData(result);
        setCachedMeals(dateKey, result);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [dateKey]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await mealService.deleteMeal(deleteId);
      setData(prev => {
        const next = { ...prev, meals: prev.meals.filter(m => m.id !== deleteId) };
        setCachedMeals(dateKey, next);
        return next;
      });
      setDeleteId(null);
    } catch (err) {
      alert('Failed to delete meal');
      console.error(err);
    }
  };

  // Only show the loading state when we have nothing cached to render.
  if (loading && !data) {
    return <div className="p-6 text-center font-bold text-xs uppercase tracking-widest">{t('dashboard.loading')}</div>;
  }

  const goal = user?.daily_calorie_goal || 2000;

  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;
  if (data && data.meals) {
    data.meals.forEach(m => {
      totalCalories += m.total_calories || 0;
      totalProtein += m.total_protein || 0;
      totalCarbs += m.total_carbs || 0;
      totalFats += m.total_fats || 0;
    });
  }

  const progresspct = Math.min((totalCalories / goal) * 100, 100);

  // Macro goals based on typical macro distribution
  const proteinGoal = Math.round(goal / 16);  // ~25% of calories from protein
  const carbsGoal = Math.round(goal / 8);     // ~50% of calories from carbs
  const fatsGoal = Math.round(goal / 36);     // ~25% of calories from fats

  const proteinPct = Math.min((totalProtein / proteinGoal) * 100, 100);
  const carbsPct = Math.min((totalCarbs / carbsGoal) * 100, 100);
  const fatsPct = Math.min((totalFats / fatsGoal) * 100, 100);
  const localeTag = lang === 'pl' ? 'pl-PL' : 'en-US';
  const todayDate = new Date().toLocaleDateString(localeTag, { weekday: 'long', month: 'short', day: 'numeric' });

  const macros = [
    { key: 'protein', icon: 'fitness_center', value: totalProtein, target: proteinGoal, pct: proteinPct },
    { key: 'carbs', icon: 'grain', value: totalCarbs, target: carbsGoal, pct: carbsPct },
    { key: 'fats', icon: 'water_drop', value: totalFats, target: fatsGoal, pct: fatsPct },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-10 sm:space-y-12">
      <motion.div variants={fadeUp}>
        <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter uppercase border-b-4 border-black inline-block mb-3">{t('dashboard.title')}</h2>
        <p className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-[0.3em]">{todayDate}</p>
      </motion.div>

      <motion.div variants={fadeUp} className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-6 sm:p-8 md:p-10 relative">
          <div className="flex flex-col">
            <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-6">{t('dashboard.consumedToday')}</span>
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
              <span className="font-black tracking-tighter text-black leading-none text-[clamp(3.25rem,17vw,6rem)]"><CountUp value={Math.round(totalCalories)} /></span>
              <span className="text-xl sm:text-2xl font-black text-secondary shrink-0">{t('common.kcal')}</span>
            </div>
          </div>
          <div className="mt-10 sm:mt-12 h-5 w-full bg-surface-container-low border-2 border-black relative overflow-hidden">
            <motion.div className="h-full bg-secondary" initial={{ width: 0 }} animate={{ width: `${progresspct}%` }} transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}></motion.div>
          </div>
          <div className="flex flex-wrap justify-between items-center mt-6 gap-x-3 gap-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('dashboard.target', { goal })}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{t('dashboard.ofBudget', { pct: Math.round(progresspct) })}</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-6">
        <h3 className="font-bold text-[12px] uppercase tracking-[0.3em] text-on-surface-variant">{t('dashboard.macroLedger')}</h3>
        <div className="border-2 border-black divide-y-2 divide-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {macros.map(m => (
            <div key={m.key} className="bg-white p-5 sm:p-8">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="material-symbols-outlined text-secondary text-2xl shrink-0">{m.icon}</span>
                  <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant truncate">{t(`dashboard.${m.key}`)}</span>
                </div>
                <span className="text-lg font-black shrink-0">{Math.round(m.value)}<span className="text-[10px] text-on-surface-variant ml-1">/ {m.target}g</span></span>
              </div>
              <div className="h-2.5 w-full bg-surface-container-low border border-black/20 overflow-hidden">
                <motion.div className="h-full bg-secondary" initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}></motion.div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.section variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">{t('dashboard.recentJournal')}</h3>
        </div>
        <div className="border-2 border-black divide-y-2 divide-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {(!data?.meals || data.meals.length === 0) ? (
            <div className="p-6 bg-white text-center font-bold text-xs tracking-widest uppercase text-on-surface-variant">{t('dashboard.noEntries')}</div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show">
              {data.meals.map(meal => (
                <motion.div
                  key={meal.id}
                  variants={popIn}
                  onClick={() => navigate('/summary', { state: { meal } })}
                  className="flex items-center justify-between gap-3 p-4 sm:p-6 bg-white group hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 border-2 border-black flex items-center justify-center bg-white shrink-0 group-hover:bg-secondary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined">{getMealIcon(meal.meal_type)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase tracking-tight truncate">{meal.meal_title || t(`mealType.${meal.meal_type?.toUpperCase()}`)}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase mt-0.5 truncate">{t(`mealType.${meal.meal_type?.toUpperCase()}`)} • {t('dashboard.items', { count: meal.items?.length || 0 })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="text-right shrink-0">
                      <p className="text-lg sm:text-xl font-black whitespace-nowrap">{Math.round(meal.total_calories)} <span className="text-[10px] text-secondary">{t('common.kcal')}</span></p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(meal.id);
                      }}
                      className="p-2 text-on-surface-variant hover:text-error transition-colors shrink-0"
                      aria-label={t('common.delete')}
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              variants={modalBackdrop} initial="hidden" animate="show" exit="exit"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}
            ></motion.div>
            <motion.div
              variants={modalPanel} initial="hidden" animate="show" exit="exit"
              className="relative bg-white border-4 border-black p-6 sm:p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
              <h4 className="text-2xl font-black font-headline tracking-tighter uppercase mb-4">{t('dashboard.confirmTitle')}</h4>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant leading-relaxed mb-8">
                {t('dashboard.confirmBody')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteId(null)}
                  className="py-4 border-2 border-black font-black text-[10px] uppercase tracking-widest hover:bg-surface-container transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  className="py-4 bg-error text-white border-2 border-black font-black text-[10px] uppercase tracking-widest hover:bg-opacity-90 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
