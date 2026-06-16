import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CalorieWizard from './CalorieWizard';
import { authService, getErrorMessage } from '../api/client';
import { useLang } from '../i18n/LanguageContext';
import LangToggle from './LangToggle';

export default function Onboarding() {
  const { t } = useLang();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleComplete = async (payload) => {
    setSaving(true);
    setError('');
    try {
      await authService.updateProfile(payload);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, t('onboarding.saveFailed')));
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col px-6 py-6 sm:py-12">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <div className="flex-grow flex flex-col items-center justify-center">
        <header className="text-center mb-10 space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tighter">{t('onboarding.title')}</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">
            {t('onboarding.subtitle')}
          </p>
        </header>
        <CalorieWizard
          mode="onboarding"
          onComplete={handleComplete}
          onSkip={() => navigate('/')}
          saving={saving}
        />
        {error && (
          <p className="mt-6 text-error font-bold text-[10px] uppercase tracking-widest">{error}</p>
        )}
      </div>
    </div>
  );
}
