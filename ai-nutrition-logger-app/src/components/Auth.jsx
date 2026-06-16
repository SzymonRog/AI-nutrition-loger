import { useState } from 'react';
import { authService, getErrorMessage } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
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
      setError(getErrorMessage(err, 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-background flex flex-col min-h-screen">
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-12">
          <header className="text-center space-y-4">
            <h2 className="font-headline font-bold text-xs uppercase tracking-[0.3em] text-on-surface-variant">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </h2>
            <p className="text-on-surface-variant font-medium tracking-tight text-sm">
              Secure access to your health ledger.
            </p>
          </header>
          <div className="bg-surface border-2 border-black p-8 md:p-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block font-label text-[10px] uppercase tracking-[0.2em] text-on-surface font-bold">
                  Account Email
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
                  Security Key
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
                <button
                  className="w-full bg-secondary text-on-secondary py-4 px-6 font-bold tracking-widest text-sm uppercase transition-all hover:bg-on-secondary-fixed active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (isLogin ? 'Open Ledger' : 'Create Ledger')}
                </button>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <a className="hover:text-secondary transition-colors cursor-pointer" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? 'Create Account' : 'Sign In instead'}
                  </a>
                </div>
              </div>
            </form>
          </div>
          <footer className="text-center pt-8">
            <p className="text-[10px] font-label uppercase tracking-[0.3em] text-on-surface-variant/40">Encrypted Entry</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
