import { Outlet, NavLink } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-secondary-container pb-32 flex flex-col min-h-screen">
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-12 flex-grow w-full">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 py-4 bg-white border-t-2 border-black pb-safe">
        <NavLink
          to="/"
          className={({ isActive }) => isActive
            ? "flex flex-col items-center justify-center bg-secondary text-white px-4 py-2 border-2 border-black"
            : "flex flex-col items-center justify-center text-black p-2 hover:bg-surface-container-low transition-colors"}
        >
          {({ isActive }) => (
            <>
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
              <span className="text-[9px] uppercase tracking-widest font-black mt-1">Home</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/add"
          className={({ isActive }) => isActive
            ? "flex flex-col items-center justify-center bg-secondary text-white px-4 py-2 border-2 border-black"
            : "flex flex-col items-center justify-center text-black p-2 hover:bg-surface-container-low transition-colors"}
        >
          {({ isActive }) => (
            <>
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>add_circle</span>
              <span className="text-[9px] uppercase tracking-widest font-black mt-1">Add</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) => isActive
            ? "flex flex-col items-center justify-center bg-secondary text-white px-4 py-2 border-2 border-black"
            : "flex flex-col items-center justify-center text-black p-2 hover:bg-surface-container-low transition-colors"}
        >
          {({ isActive }) => (
            <>
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>history</span>
              <span className="text-[9px] uppercase tracking-widest font-black mt-1">History</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => isActive
            ? "flex flex-col items-center justify-center bg-secondary text-white px-4 py-2 border-2 border-black"
            : "flex flex-col items-center justify-center text-black p-2 hover:bg-surface-container-low transition-colors"}
        >
          {({ isActive }) => (
            <>
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
              <span className="text-[9px] uppercase tracking-widest font-black mt-1">Profile</span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
}
