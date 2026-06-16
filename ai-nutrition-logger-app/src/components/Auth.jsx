import { useState } from 'react';
import { motion } from 'framer-motion';
import { authService, getErrorMessage } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';
import LangToggle from './LangToggle';

export default function Auth() {
  const { t } = useLang();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(email, password);
        navigate('/');
      } else {
        await authService.register(email, password);
        await authService.login(email, password); // auto login
        navigate('/onboarding');
      }
    } catch (err) {
      setError(getErrorMessage(err, t('auth.failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-background flex flex-col min-h-screen">
      <div className="flex justify-end p-4 sm:p-6">
        <LangToggle />
      </div>
      <main className="flex-grow flex flex-col items-center justify-center px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md space-y-12"
        >
          <header className="text-center space-y-4">
            <h2 className="font-headline font-bold text-xs uppercase tracking-[0.3em] text-on-surface-variant">
              {isLogin ? t('auth.signIn') : t('auth.signUp')}
            </h2>
            <p className="text-on-surface-variant font-medium tracking-tight text-sm">
              {t('auth.tagline')}
            </p>
          </header>
          <div className="bg-surface border-2 border-black p-8 md:p-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block font-label text-[10px] uppercase tracking-[0.2em] text-on-surface font-bold">
                  {t('auth.email')}
                </label>
                <div className="relative group">
                  <input
                    className="w-full bg-surface-variant/30 border-2 border-black focus:ring-0 focus:border-secondary py-4 px-4 transition-all placeholder:text-on-surface-variant/40 text-on-surface"
                    placeholder="email@example.com"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block font-label text-[10px] uppercase tracking-[0.2em] text-on-surface font-bold">
                  {t('auth.password')}
                </label>
                <div className="relative group">
                  <input
                    className="w-full bg-surface-variant/30 border-2 border-black focus:ring-0 focus:border-secondary py-4 px-4 transition-all placeholder:text-on-surface-variant/40 text-on-surface"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <div className="text-error font-bold text-[10px] uppercase tracking-widest">{error}</div>}

              <div className="pt-4 flex flex-col space-y-6">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-secondary text-on-secondary py-4 px-6 font-bold tracking-widest text-sm uppercase transition-colors hover:bg-on-secondary-fixed active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? t('auth.processing') : (isLogin ? t('auth.openLedger') : t('auth.createLedger'))}
                </motion.button>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <a className="hover:text-secondary transition-colors cursor-pointer" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? t('auth.createAccount') : t('auth.signInInstead')}
                  </a>
                </div>
              </div>
            </form>
          </div>
          <footer className="text-center pt-8">
            <p className="text-[10px] font-label uppercase tracking-[0.3em] text-on-surface-variant/40">{t('auth.footer')}</p>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
