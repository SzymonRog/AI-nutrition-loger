import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mealService } from '../api/client';
import { getMealIcon } from '../constants/mealTypeIcons';
import { useLang } from '../i18n/LanguageContext';
import CountUp from './CountUp';
import { staggerContainer, fadeUp, popIn } from '../utils/motionPresets';

export default function MealSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const localeTag = lang === 'pl' ? 'pl-PL' : 'en-US';
  const [meal, setMeal] = useState(location.state?.meal);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTotals, setEditTotals] = useState({
    total_calories: '',
    total_protein: '',
    total_carbs: '',
    total_fats: ''
  });

  // Protect route if accessed without state
  if (!meal) {
    return <Navigate to="/" replace />;
  }

  const handleEditClick = () => {
    setEditTotals({
      total_calories: Math.round(meal.total_calories).toString(),
      total_protein: Math.round(meal.total_protein).toString(),
      total_carbs: Math.round(meal.total_carbs).toString(),
      total_fats: Math.round(meal.total_fats).toString(),
    });
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      const payload = {
        total_calories: parseFloat(editTotals.total_calories || 0),
        total_protein: parseFloat(editTotals.total_protein || 0),
        total_carbs: parseFloat(editTotals.total_carbs || 0),
        total_fats: parseFloat(editTotals.total_fats || 0)
      };
      const updatedMeal = await mealService.updateMealTotals(meal.id, payload);
      setMeal(updatedMeal);
      setIsEditing(false);
      navigate(location.pathname, { state: { meal: updatedMeal }, replace: true });
    } catch (err) {
      console.error('Failed to update meal totals', err);
      alert(t('summary.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditTotals(prev => ({ ...prev, [name]: value }));
  };

  // Calculate highest macro for the focus title
  let focusKey = 'BALANCED';
  const { total_protein, total_carbs, total_fats, total_calories } = meal;

  // Calculate relative kcal contribution of macros (approximate 4/4/9)
  const proteinKcal = total_protein * 4;
  const carbsKcal = total_carbs * 4;
  const fatsKcal = total_fats * 9;

  if (proteinKcal > carbsKcal && proteinKcal > fatsKcal) {
    focusKey = 'PROTEIN';
  } else if (carbsKcal > proteinKcal && carbsKcal > fatsKcal) {
    focusKey = 'CARB';
  } else if (fatsKcal > proteinKcal && fatsKcal > carbsKcal) {
    focusKey = 'FAT';
  }

  // Primary dish name (use first parsed item or raw text)
  const dishName = meal.items && meal.items.length > 0
    ? meal.items[0].original_item.name
    : meal.raw_input_text.substring(0, 30) + '...';

  // Format date and time
  const mealDate = new Date(meal.logged_at);
  const formattedDate = mealDate.toLocaleDateString(localeTag, { weekday: 'long', month: 'short', day: 'numeric' });
  const formattedTime = mealDate.toLocaleTimeString(localeTag, { hour: 'numeric', minute: '2-digit' });

  // Budget calculation (assuming 2000 as a standard default if user context is missing here, but it should be sufficient for visuals)
  const DAILY_BUDGET = 2000;
  const percentageUsed = Math.min(Math.round((total_calories / DAILY_BUDGET) * 100), 100);

  const macroFields = [
    { name: 'total_protein', icon: 'fitness_center', value: total_protein, label: t('summary.protein') },
    { name: 'total_carbs', icon: 'grain', value: total_carbs, label: t('summary.carbs') },
    { name: 'total_fats', icon: 'water_drop', value: total_fats, label: t('summary.fats') },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 pb-20">
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter uppercase font-headline border-b-4 border-black inline-block mb-2">
          {t('summary.title', { type: t(`mealType.${meal.meal_type?.toUpperCase()}`) })}
        </h1>
        <p className="text-on-surface-variant font-bold text-[10px] tracking-[0.3em] uppercase">
          {formattedDate} • {formattedTime}
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="high-contrast-border neo-shadow bg-white flex flex-col">
        <div className="p-6 border-b-2 border-black relative">
          <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-on-surface-variant mb-2">{t('summary.totalEnergy')}</h2>
          <div className="flex items-baseline gap-1 flex-wrap pr-10">
            {isEditing ? (
              <input
                type="number"
                name="total_calories"
                value={editTotals.total_calories}
                onChange={handleChange}
                className="text-5xl sm:text-6xl font-black tracking-tighter leading-none w-32 bg-transparent border-2 border-black p-1 focus:outline-none"
              />
            ) : (
              <span className="font-black tracking-tighter leading-none text-[clamp(3rem,15vw,4.5rem)]"><CountUp value={Math.round(total_calories)} /></span>
            )}
            <span className="text-sm font-bold tracking-widest uppercase">{t('common.kcal')}</span>
          </div>

          <div className="absolute top-6 right-6">
            {!isEditing && (
              <motion.button whileHover={{ scale: 1.15, rotate: -6 }} whileTap={{ scale: 0.9 }} onClick={handleEditClick} aria-label="Edit">
                <span className="material-symbols-outlined text-black">edit_note</span>
              </motion.button>
            )}
          </div>

          <div className="mt-6">
            <div className="h-4 w-full high-contrast-border overflow-hidden flex bg-white">
              <motion.div className="h-full bg-secondary" initial={{ width: 0 }} animate={{ width: `${percentageUsed}%` }} transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}></motion.div>
            </div>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-2">
              {t('summary.budgetUsed', { pct: percentageUsed })}
            </p>
          </div>
        </div>

        <div className="bg-[#f0f5f1] p-6">
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <span className="material-symbols-outlined text-secondary shrink-0">{getMealIcon(meal.meal_type)}</span>
            <h3 className="font-extrabold text-sm uppercase tracking-wider truncate">{dishName}</h3>
          </div>
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mb-1 mt-4">{t('summary.macroFocus')}</p>
          <p className="font-black text-xl tracking-tighter uppercase text-secondary">{t(`summary.focus.${focusKey}`)}</p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-on-surface-variant mb-2">{t('summary.macroLedger')}</h3>
        <motion.div variants={staggerContainer} className="grid grid-cols-3 high-contrast-border neo-shadow bg-white divide-x-2 divide-black border-black">
          {macroFields.map(f => (
            <motion.div variants={popIn} key={f.name} className="flex flex-col items-center justify-center py-6 px-1 sm:px-2">
              <span className="material-symbols-outlined text-secondary mb-2">{f.icon}</span>
              <div className="flex items-baseline gap-1">
                {isEditing ? (
                  <input type="number" name={f.name} value={editTotals[f.name]} onChange={handleChange} className="text-xl font-black w-12 sm:w-14 border border-black p-1 text-center bg-transparent focus:outline-none" />
                ) : (
                  <span className="text-2xl font-black">{Math.round(f.value)}</span>
                )}
                <span className="text-xs font-bold">g</span>
              </div>
              <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-1 text-center">{f.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} className="high-contrast-border neo-shadow bg-white mt-8">
        <h3 className="bg-black text-white text-[10px] font-black tracking-[0.3em] uppercase p-3 border-b-2 border-black">
          {t('summary.mappedItems')}
        </h3>
        <div className="divide-y-2 divide-black">
          {meal.items && meal.items.length > 0 ? (
            meal.items.map((item, idx) => (
              <div key={idx} className="p-3 flex justify-between items-center gap-3 bg-[#fcfcfc]">
                <div className="min-w-0">
                  <p className="font-bold text-sm uppercase truncate">{item.original_item.name}</p>
                  <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-on-surface-variant">
                    {item.original_item.quantity} {item.original_item.unit}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-sm whitespace-nowrap">{Math.round(item.macros.calories)} <span className="text-[9px]">{t('common.kcal')}</span></p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3">
              <p className="text-xs font-bold uppercase text-on-surface-variant">{t('summary.noItems')}</p>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="high-contrast-border border-dashed neo-shadow p-4 flex gap-4 mt-8 bg-white items-start">
        <span className="material-symbols-outlined text-black mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
        <div>
          <h4 className="text-[9px] font-black tracking-[0.2em] uppercase mb-1">{t('summary.disclaimerTitle')}</h4>
          <p className="text-[10px] font-bold text-on-surface-variant leading-relaxed uppercase tracking-wider">
            {t('summary.disclaimerBody')}
          </p>
        </div>
      </motion.div>

      {isEditing ? (
        <motion.div variants={fadeUp} className="flex gap-4 mb-4 mt-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCancelClick}
            disabled={isSaving}
            className="flex-1 bg-white text-black border-2 border-black py-5 px-4 font-headline font-black text-sm tracking-[0.2em] uppercase neo-shadow disabled:opacity-50"
          >
            {t('common.cancel')}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex-1 bg-secondary text-white border-2 border-black py-5 px-4 font-headline font-black text-sm tracking-[0.2em] uppercase neo-shadow disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isSaving ? t('common.saving') : t('summary.saveOverrides')}
          </motion.button>
        </motion.div>
      ) : (
        <motion.button
          variants={fadeUp}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/')}
          className="w-full bg-secondary text-white border-2 border-black py-5 px-6 font-headline font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 neo-shadow mb-4 mt-4"
        >
          <span className="material-symbols-outlined text-white">done</span>
          {t('common.done')}
        </motion.button>
      )}
    </motion.div>
  );
}
