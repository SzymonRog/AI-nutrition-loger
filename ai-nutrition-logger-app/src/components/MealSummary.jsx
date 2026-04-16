import { useLocation, useNavigate, Navigate } from 'react-router-dom';

export default function MealSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const meal = location.state?.meal;

  // Protect route if accessed without state
  if (!meal) {
    return <Navigate to="/" replace />;
  }

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

      <div className="high-contrast-border bg-white flex flex-col">
        <div className="p-6 border-b border-black relative">
          <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-on-surface-variant mb-2">Total Energy</h2>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl font-black tracking-tighter leading-none">{Math.round(total_calories)}</span>
            <span className="text-sm font-bold tracking-widest uppercase">KCAL</span>
          </div>
          
          <div className="absolute top-6 right-6">
            <span className="material-symbols-outlined text-black">edit_note</span>
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
            <span className="material-symbols-outlined text-secondary">restaurant</span>
            <h3 className="font-extrabold text-sm uppercase tracking-wider">{dishName}</h3>
          </div>
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mb-1 mt-4">Macro Focus</p>
          <p className="font-black text-xl tracking-tighter uppercase text-secondary">{focusMacro}</p>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-on-surface-variant mb-2">Macro Ledger</h3>
        <div className="grid grid-cols-3 high-contrast-border bg-white divide-x border-black">
          <div className="flex flex-col items-center justify-center py-6 px-2">
            <span className="material-symbols-outlined text-secondary mb-2">fitness_center</span>
            <div className="flex items-baseline">
              <span className="text-2xl font-black">{Math.round(total_protein)}</span>
              <span className="text-xs font-bold">g</span>
            </div>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-1">Protein</span>
          </div>
          <div className="flex flex-col items-center justify-center py-6 px-2 border-l border-black">
            <span className="material-symbols-outlined text-secondary mb-2">grain</span>
            <div className="flex items-baseline">
              <span className="text-2xl font-black">{Math.round(total_carbs)}</span>
              <span className="text-xs font-bold">g</span>
            </div>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-1">Carbs</span>
          </div>
          <div className="flex flex-col items-center justify-center py-6 px-2 border-l border-black">
            <span className="material-symbols-outlined text-secondary mb-2">water_drop</span>
            <div className="flex items-baseline">
              <span className="text-2xl font-black">{Math.round(total_fats)}</span>
              <span className="text-xs font-bold">g</span>
            </div>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mt-1">Fats</span>
          </div>
        </div>
      </div>

      <div className="high-contrast-border border-dashed p-4 flex gap-4 mt-8 bg-white items-start">
        <span className="material-symbols-outlined text-black mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
        <div>
          <h4 className="text-[9px] font-black tracking-[0.2em] uppercase mb-1">System Disclaimer</h4>
          <p className="text-[10px] font-bold text-on-surface-variant leading-relaxed uppercase tracking-wider">
            Values are calculated based on standard portion sizes. Review individual ingredients in detail view for precise data.
          </p>
        </div>
      </div>

      <button 
        onClick={() => navigate('/')} 
        className="w-full bg-black text-white py-5 px-6 font-headline font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-neutral-800 active:scale-[0.98] transition-transform shadow-[4px_4px_0px_0px_rgba(27,48,34,1)] mb-4"
      >
        <span className="material-symbols-outlined text-white">edit</span>
        Adjust Meal Ledger
      </button>
    </div>
  );
}
