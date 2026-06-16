import { useState, useEffect } from 'react';
import { authService, getErrorMessage } from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import CalorieWizard from './CalorieWizard';
import { useLang } from '../i18n/LanguageContext';

export default function Profile() {
  const { t } = useLang();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [manualGoal, setManualGoal] = useState('');
  const [showManual, setShowManual] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    authService.getCurrentUser()
      .then((data) => { setUser(data); setManualGoal(data.daily_calorie_goal); })
      .catch(() => setError(t('profile.loadFailed')))
      .finally(() => setLoading(false));
  }, []);

  const handleComplete = async (payload) => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const updated = await authService.updateProfile(payload);
      setUser(updated);
      setManualGoal(updated.daily_calorie_goal);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err, t('profile.updateFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    const n = parseInt(manualGoal, 10);
    if (!manualGoal || Number.isNaN(n)) {
      setError(t('profile.invalidNumber'));
      return;
    }
    if (n < 500 || n > 10000) {
      setError(t('profile.rangeError'));
      return;
    }
    await handleComplete({ daily_calorie_goal: n });
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/auth');
  };

  if (loading) {
    return <div className="p-6 text-center font-bold text-xs uppercase tracking-widest">{t('profile.loading')}</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <section>
        <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter uppercase border-b-4 border-black inline-block mb-3">{t('profile.title')}</h2>
        <p className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-[0.3em]">{t('profile.subtitle')}</p>
      </section>

      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8 space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('profile.email')}</label>
        <div className="text-lg sm:text-xl font-bold border-b-2 border-black/10 pb-2 break-all">{user?.email}</div>
        <div className="pt-4 flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{t('profile.currentGoal')}</span>
          <span className="text-2xl font-black">{user?.daily_calorie_goal} <span className="text-sm text-black/30">{t('common.kcal')}</span></span>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border-2 border-error p-4 flex items-center gap-3 text-error font-bold text-[10px] uppercase tracking-widest">
          <span className="material-symbols-outlined">report</span>{error}
        </div>
      )}
      {success && (
        <div className="bg-secondary/10 border-2 border-secondary p-4 flex items-center gap-3 text-secondary font-bold text-[10px] uppercase tracking-widest">
          <span className="material-symbols-outlined">check_circle</span>{t('profile.saved')}
        </div>
      )}

      <CalorieWizard
        mode="profile"
        initialValues={user}
        onComplete={handleComplete}
        saving={saving}
      />

      <div className="border-2 border-black/10 p-6">
        <button
          onClick={() => setShowManual((v) => !v)}
          className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:underline underline-offset-4"
        >
          {showManual ? t('profile.hideManual') : t('profile.showManual')}
        </button>
        {showManual && (
          <div className="mt-4 flex gap-3">
            <input
              type="number"
              value={manualGoal}
              onChange={(e) => setManualGoal(e.target.value)}
              className="flex-grow bg-surface-container-low border-2 border-black p-4 text-2xl font-black tracking-tighter outline-none"
            />
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="bg-black text-white px-6 border-2 border-black font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
            >
              {t('common.save')}
            </button>
          </div>
        )}
      </div>

      <Link
        to="/calculator"
        className="flex items-center justify-between border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all hover:bg-secondary-container"
      >
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-3xl">calculate</span>
          <div>
            <p className="font-black uppercase tracking-tight">{t('profile.calculators')}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('profile.calculatorsSub')}</p>
          </div>
        </div>
        <span className="material-symbols-outlined">chevron_right</span>
      </Link>

      <div className="pt-4 flex flex-col items-center gap-6">
        <button
          onClick={handleLogout}
          className="text-xs font-black uppercase tracking-[0.3em] text-error hover:underline decoration-2 underline-offset-8"
        >
          {t('profile.signOut')}
        </button>
      </div>
    </div>
  );
}
