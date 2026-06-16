import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { mealService } from '../api/client';
import { getMealIcon } from '../constants/mealTypeIcons';
import { useLang } from '../i18n/LanguageContext';
import {
  staggerContainer, fadeUp, popIn, modalBackdrop, modalPanel,
} from '../utils/motionPresets';

export default function History() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const localeTag = lang === 'pl' ? 'pl-PL' : 'en-US';
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await mealService.getHistory(100);
      setHistory(data.meals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await mealService.deleteMeal(deleteId);
      setHistory(prev => prev.filter(m => m.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      alert('Failed to delete meal');
      console.error(err);
    }
  };

  // Group meals by date
  const groupedMeals = history.reduce((groups, meal) => {
    const date = new Date(meal.logged_at).toLocaleDateString(localeTag, {
      weekday: 'long', month: 'short', day: 'numeric'
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(meal);
    return groups;
  }, {});

  if (loading) {
    return <div className="p-6 text-center font-bold text-xs uppercase tracking-widest">{t('history.loading')}</div>;
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-12">
      <motion.section variants={fadeUp}>
        <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter uppercase border-b-4 border-black inline-block mb-3">{t('history.title')}</h2>
        <p className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-[0.3em]">{t('history.subtitle')}</p>
      </motion.section>

      {Object.keys(groupedMeals).length === 0 ? (
        <motion.div variants={fadeUp} className="border-2 border-dashed border-black p-12 text-center">
          <p className="text-xs font-black uppercase tracking-widest opacity-40">{t('history.empty')}</p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedMeals).map(([date, meals]) => (
            <motion.div key={date} variants={fadeUp} className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant bg-surface-container px-2 py-1 inline-block border border-black">
                {date}
              </h3>
              <motion.div variants={staggerContainer} className="border-2 border-black divide-y-2 divide-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {meals.map(meal => (
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
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase mt-0.5 truncate">
                          {t(`mealType.${meal.meal_type?.toUpperCase()}`)} • {new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {t('history.items', { count: meal.items?.length || 0 })}
                        </p>
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
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}

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
              <h4 className="text-2xl font-black font-headline tracking-tighter uppercase mb-4">{t('history.confirmTitle')}</h4>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant leading-relaxed mb-8">
                {t('history.confirmBody')}
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
