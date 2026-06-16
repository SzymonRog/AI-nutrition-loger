import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mealService } from '../api/client';
import { getMealIcon } from '../constants/mealTypeIcons';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await mealService.getHistory(100);
      setHistory(data.meals || []);
    } catch (err) {
      setError('Failed to load history');
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
    const date = new Date(meal.logged_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric'
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(meal);
    return groups;
  }, {});

  if (loading) {
    return <div className="p-6 text-center font-bold text-xs uppercase tracking-widest">Rewinding Time...</div>;
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-4xl font-black font-headline tracking-tighter uppercase border-b-4 border-black inline-block mb-3">Meal History</h2>
        <p className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-[0.3em]">Your Journaling Journey</p>
      </section>

      {Object.keys(groupedMeals).length === 0 ? (
        <div className="border-2 border-dashed border-black p-12 text-center">
          <p className="text-xs font-black uppercase tracking-widest opacity-40">No records found</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedMeals).map(([date, meals]) => (
            <div key={date} className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant bg-surface-container px-2 py-1 inline-block border border-black">
                {date}
              </h3>
              <div className="border-2 border-black divide-y-2 divide-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {meals.map(meal => (
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
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase mt-0.5">
                          {meal.meal_type} • {new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {meal.items?.length || 0} items
                        </p>
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
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}></div>
          <div className="relative bg-white border-4 border-black p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] scale-in-center">
            <h4 className="text-2xl font-black font-headline tracking-tighter uppercase mb-4">Confirm Deletion</h4>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant leading-relaxed mb-8">
              Are you sure you want to remove this entry from your ledger? This action cannot be undone.
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
    </div>
  );
}
