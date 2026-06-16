import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../i18n/LanguageContext';
import LangToggle from './LangToggle';

const NAV_ITEMS = [
  { to: '/', end: true, icon: 'home', key: 'home' },
  { to: '/add', icon: 'add_circle', key: 'add' },
  { to: '/history', icon: 'history', key: 'history' },
  { to: '/profile', icon: 'person', key: 'profile' },
];

// Crisp, layout-stable page transition: a quick fade + tiny lift. No element
// changes size, so nothing reflows mid-animation.
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export default function Layout() {
  const location = useLocation();
  const { t } = useLang();

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-secondary-container pb-32 flex flex-col min-h-screen overflow-x-hidden">
      {/* Top bar: brand + language toggle. Sticky so the switch is always reachable. */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-sm border-b-2 border-black/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-[0.3em]">Ledger</span>
          <LangToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-grow w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-10 sm:space-y-12"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 bg-white border-t-2 border-black pb-safe">
        <div className="max-w-2xl mx-auto grid grid-cols-4 px-2 sm:px-6 pt-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className="relative flex flex-col items-center justify-center py-2 outline-none"
            >
              {({ isActive }) => (
                <>
                  {/* Sliding active background — shared layoutId means it
                      animates between tabs instead of resizing in place. */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-1 inset-y-0 bg-secondary border-2 border-black"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span
                    className={`material-symbols-outlined relative z-10 text-2xl transition-colors ${
                      isActive ? 'text-white' : 'text-black'
                    }`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`relative z-10 text-[9px] uppercase tracking-widest font-black mt-1 transition-colors ${
                      isActive ? 'text-white' : 'text-black'
                    }`}
                  >
                    {t(`nav.${item.key}`)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
