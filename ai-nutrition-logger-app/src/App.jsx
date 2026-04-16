import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import MealEntry from './components/MealEntry';
import MealSummary from './components/MealSummary';
import History from './components/History';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/auth" />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/auth" element={
        <div className="app-container">
          <Auth />
        </div>
      } />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="add" element={<MealEntry />} />
        <Route path="history" element={<History />} />
        <Route path="summary" element={<MealSummary />} />
        <Route path="profile" element={
          <div className="space-y-4">
            <div>
              <h2 className="text-4xl font-black font-headline tracking-tighter uppercase border-b-4 border-black inline-block mb-3">Profile</h2>
              <p className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-[0.3em]">User Settings</p>
            </div>
            <div className="border-2 border-black bg-white p-8 md:p-10 text-center">
              <button 
                className="w-full bg-secondary text-white py-4 px-6 border-2 border-black font-headline font-black text-sm tracking-[0.2em] uppercase transition-all hover:bg-opacity-90 active:scale-[0.98]" 
                onClick={() => {
                  localStorage.removeItem('access_token');
                  window.location.href = '/auth';
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        } />
      </Route>
    </Routes>
  );
}

export default App;
