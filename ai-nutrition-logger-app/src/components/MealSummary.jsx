import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { mealService } from '../api/client';
import { getMealIcon } from '../constants/mealTypeIcons';

export default function MealSummary() {
  const location = useLocation();
  const navigate = useNavigate();
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
      alert('Failed to update meal totals.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditTotals(prev => ({ ...prev, [name]: value }));
  };

  // Calculate highest macro for the focus title
  let focusMacro = 'BALANCED';
  let focusColor = 'text-black';
  const { total_protein, total_carbs, total_fats, total_calories } = meal;

  // Calculate relative kcal contribution of macros (approximate 4/4/9)
  const proteinKcal = total_protein * 4;
  const carbsKcal = total_carbs * 4;
  const fatsKcal = total_fats * 9;

  if (proteinKcal > carbsKcal && proteinKcal > fatsKcal) {
    focusMacro = 'HIGH PROTEIN';
  } else if (carbsKcal > proteinKcal && carbsKcal > fatsKcal) {
    focusMacro = 'HIGH CARB';
  } else if (fatsKcal > proteinKcal && fatsKcal > carbsKcal) {
    focusMacro = 'HIGH FAT';
  }

  // Primary dish name (use first parsed item or raw text)
  const dishName = meal.items && meal.items.length > 0
    ? meal.items[0].original_item.name
    : meal.raw_input_text.substring(0, 30) + '...';

  // Format date and time
  const mealDate = new Date(meal.logged_at);
  const formattedDate = mealDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const formattedTime = mealDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Budget calculation (assuming 2000 as a standard default if user context is missing here, but it should be sufficient for visuals)
  const DAILY_BUDGET = 2000;
  const percentageUsed = Math.min(Math.round((total_calories / DAILY_BUDGET) * 100), 100);

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tighter uppercase font-headline border-b-4 border-black inline-block mb-2">
          {meal.meal_type} Ledger
        </h1>
        <p className="text-on-surface-variant font-bold text-[10px] tracking-[0.3em] uppercase">
          {formattedDate} • {formattedTime}
        </p>
      </div>

      <div className="high-contrast-border neo-shadow bg-white flex flex-col">
        <div className="p-6 border-b-2 border-black relative">
          <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-on-surface-variant mb-2">Total Energy</h2>
          <div className="flex items-baseline gap-1">
            {isEditing ? (
              <input
                type="number"
                name="total_calories"
                value={editTotals.total_calories}
                onChange={handleChange}
                className="text-6xl font-black tracking-tighter leading-none w-32 bg-transparent border-2 border-black p-1 focus:outline-none"
              />
            ) : (
              <span className="text-7xl font-black tracking-tighter leading-none">{Math.round(total_calories)}</span>
            )}
            <span className="text-sm font-bold tracking-widest uppercase">KCAL</span>
          </div>

          <div className="absolute top-6 right-6">
            {!isEditing && (
              <button onClick={handleEditClick} className="hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-black">edit_note</span>
              </button>
            )}
          </div>

          <div className="mt-6">
            <div className="h-4 w-full high-contrast-border overflow-hidden flex bg-white">
              <div className="h-full bg-secondary" style={{ width: `${percentageUsed}%` }}></div>
            </div>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-2">
              {percentageUsed}% of daily budget used.
            </p>
          </div>
        </div>

        <div className="bg-[#f0f5f1] p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-secondary">{getMealIcon(meal.meal_type)}</span>
            <h3 className="font-extrabold text-sm uppercase tracking-wider">{dishName}</h3>
          </div>
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mb-1 mt-4">Macro Focus</p>
          <p className="font-black text-xl tracking-tighter uppercase text-secondary">{focusMacro}</p>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-on-surface-variant mb-2">Macro Ledger</h3>
        <div className="grid grid-cols-3 high-contrast-border neo-shadow bg-white divide-x-2 divide-black border-black">
          <div className="flex flex-col items-center justify-center py-6 px-2">
            <span className="material-symbols-outlined text-secondary mb-2">fitness_center</span>
            <div className="flex items-baseline gap-1">
              {isEditing ? (
                <input type="number" name="total_protein" value={editTotals.total_protein} onChange={handleChange} className="text-xl font-black w-14 border border-black p-1 text-center bg-transparent focus:outline-none" />
              ) : (
                <span className="text-2xl font-black">{Math.round(total_protein)}</span>
              )}
              <span className="text-xs font-bold">g</span>
            </div>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-1">Protein</span>
          </div>
          <div className="flex flex-col items-center justify-center py-6 px-2">
            <span className="material-symbols-outlined text-secondary mb-2">grain</span>
            <div className="flex items-baseline gap-1">
              {isEditing ? (
                <input type="number" name="total_carbs" value={editTotals.total_carbs} onChange={handleChange} className="text-xl font-black w-14 border border-black p-1 text-center bg-transparent focus:outline-none" />
              ) : (
                <span className="text-2xl font-black">{Math.round(total_carbs)}</span>
              )}
              <span className="text-xs font-bold">g</span>
            </div>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-1">Carbs</span>
          </div>
          <div className="flex flex-col items-center justify-center py-6 px-2">
            <span className="material-symbols-outlined text-secondary mb-2">water_drop</span>
            <div className="flex items-baseline gap-1">
              {isEditing ? (
                <input type="number" name="total_fats" value={editTotals.total_fats} onChange={handleChange} className="text-xl font-black w-14 border border-black p-1 text-center bg-transparent focus:outline-none" />
              ) : (
                <span className="text-2xl font-black">{Math.round(total_fats)}</span>
              )}
              <span className="text-xs font-bold">g</span>
            </div>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-1">Fats</span>
          </div>
        </div>
      </div>

      <div className="high-contrast-border neo-shadow bg-white mt-8">
        <h3 className="bg-black text-white text-[10px] font-black tracking-[0.3em] uppercase p-3 border-b-2 border-black">
          Mapped Items
        </h3>
        <div className="divide-y-2 divide-black">
          {meal.items && meal.items.length > 0 ? (
            meal.items.map((item, idx) => (
              <div key={idx} className="p-3 flex justify-between items-center bg-[#fcfcfc]">
                <div>
                  <p className="font-bold text-sm uppercase">{item.original_item.name}</p>
                  <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-on-surface-variant">
                    {item.original_item.quantity} {item.original_item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">{Math.round(item.macros.calories)} <span className="text-[9px]">KCAL</span></p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3">
              <p className="text-xs font-bold uppercase text-on-surface-variant">No items mapped</p>
            </div>
          )}
        </div>
      </div>

      <div className="high-contrast-border border-dashed neo-shadow p-4 flex gap-4 mt-8 bg-white items-start">
        <span className="material-symbols-outlined text-black mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
        <div>
          <h4 className="text-[9px] font-black tracking-[0.2em] uppercase mb-1">System Disclaimer</h4>
          <p className="text-[10px] font-bold text-on-surface-variant leading-relaxed uppercase tracking-wider">
            Values are calculated based on standard portion sizes. Review individual ingredients in detail view for precise data.
          </p>
        </div>
      </div>

      {isEditing ? (
        <div className="flex gap-4 mb-4 mt-4">
          <button
            onClick={handleCancelClick}
            disabled={isSaving}
            className="flex-1 bg-white text-black border-2 border-black py-5 px-4 font-headline font-black text-sm tracking-[0.2em] uppercase transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none neo-shadow disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex-1 bg-secondary text-white border-2 border-black py-5 px-4 font-headline font-black text-sm tracking-[0.2em] uppercase transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none neo-shadow disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isSaving ? 'Saving...' : 'Save Overrides'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate('/')}
          className="w-full bg-secondary text-white border-2 border-black py-5 px-6 font-headline font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none neo-shadow mb-4 mt-4"
        >
          <span className="material-symbols-outlined text-white">done</span>
          Done
        </button>
      )}
    </div>
  );
}
