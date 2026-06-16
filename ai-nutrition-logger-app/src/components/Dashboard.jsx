import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mealService, authService } from '../api/client';
import { getMealIcon } from '../constants/mealTypeIcons';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = await authService.getCurrentUser();
        setUser(u);
        const dateStr = new Date().toISOString().split('T')[0];
        const result = await mealService.getMealsByDate(dateStr);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [deleteId, setDeleteId] = useState(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await mealService.deleteMeal(deleteId);
      setData(prev => ({
        ...prev,
        meals: prev.meals.filter(m => m.id !== deleteId)
      }));
      setDeleteId(null);
    } catch (err) {
      alert('Failed to delete meal');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-6 text-center font-bold text-xs uppercase tracking-widest">Compiling Ledger...</div>;
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
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <>
      <div>
        <h2 className="text-4xl font-black font-headline tracking-tighter uppercase border-b-4 border-black inline-block mb-3">Daily Ledger</h2>
        <p className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-[0.3em]">{todayDate}</p>
      </div>

      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-8 md:p-10 relative">
          <div className="flex flex-col">
            <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-6">Consumed Today</span>
            <div className="flex items-baseline gap-3 overflow-hidden">
              <span className="text-7xl sm:text-8xl font-black tracking-tighter text-black leading-none">{Math.round(totalCalories)}</span>
              <span className="text-xl sm:text-2xl font-black text-secondary shrink-0">KCAL</span>
            </div>
          </div>
          <div className="mt-12 h-5 w-full bg-surface-container-low border-2 border-black relative overflow-hidden">
            <div className="h-full bg-secondary" style={{ width: `${progresspct}%` }}></div>
          </div>
          <div className="flex flex-wrap justify-between items-center mt-6 gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Target: {goal} KCAL</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{Math.round(progresspct)}% OF BUDGET</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-bold text-[12px] uppercase tracking-[0.3em] text-on-surface-variant">Macro Ledger</h3>
        <div className="border-2 border-black divide-y-2 divide-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {/* Protein */}
          <div className="bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-2xl">fitness_center</span>
                <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Protein</span>
              </div>
              <span className="text-lg font-black">{Math.round(totalProtein)}<span className="text-[10px] text-on-surface-variant ml-1">/ {proteinGoal}g</span></span>
            </div>
            <div className="h-2.5 w-full bg-surface-container-low border border-black/20">
              <div className="h-full bg-secondary transition-all" style={{ width: `${proteinPct}%` }}></div>
            </div>
          </div>
          {/* Carbs */}
          <div className="bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-2xl">grain</span>
                <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Carbs</span>
              </div>
              <span className="text-lg font-black">{Math.round(totalCarbs)}<span className="text-[10px] text-on-surface-variant ml-1">/ {carbsGoal}g</span></span>
            </div>
            <div className="h-2.5 w-full bg-surface-container-low border border-black/20">
              <div className="h-full bg-secondary transition-all" style={{ width: `${carbsPct}%` }}></div>
            </div>
          </div>
          {/* Fats */}
          <div className="bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-2xl">water_drop</span>
                <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Fats</span>
              </div>
              <span className="text-lg font-black">{Math.round(totalFats)}<span className="text-[10px] text-on-surface-variant ml-1">/ {fatsGoal}g</span></span>
            </div>
            <div className="h-2.5 w-full bg-surface-container-low border border-black/20">
              <div className="h-full bg-secondary transition-all" style={{ width: `${fatsPct}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Recent Journal</h3>
        </div>
        <div className="border-2 border-black divide-y-2 divide-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {(!data?.meals || data.meals.length === 0) ? (
            <div className="p-6 bg-white text-center font-bold text-xs tracking-widest uppercase text-on-surface-variant">No entries today</div>
          ) : (
            data.meals.map(meal => (
              <div
                key={meal.id}
                onClick={() => navigate('/summary', { state: { meal } })}
                className="flex items-center justify-between p-6 bg-white group hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 border-2 border-black flex items-center justify-center bg-white shrink-0 group-hover:bg-secondary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">{getMealIcon(meal.meal_type)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">{meal.meal_title || meal.meal_type}</p>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase mt-0.5">{meal.meal_type} • {meal.items?.length || 0} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black">{Math.round(meal.total_calories)} <span className="text-[10px] text-secondary">KCAL</span></p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(meal.id);
                    }}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}></div>
          <div className="relative bg-white border-4 border-black p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-200">
            <h4 className="text-2xl font-black font-headline tracking-tighter uppercase mb-4">Confirm Deletion</h4>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant leading-relaxed mb-8">
              Are you sure you want to remove this entry? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="py-4 border-2 border-black font-black text-[10px] uppercase tracking-widest hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="py-4 bg-error text-white border-2 border-black font-black text-[10px] uppercase tracking-widest hover:bg-opacity-90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
