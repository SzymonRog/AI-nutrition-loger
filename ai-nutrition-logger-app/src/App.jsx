import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import MealEntry from './components/MealEntry';
import MealSummary from './components/MealSummary';
import History from './components/History';
import Profile from './components/Profile';
import Onboarding from './components/Onboarding';
import { authService } from './api/client';

const PrivateRoute = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsValidating(false);
      return;
    }

    // Validate token with backend
    authService.getCurrentUser()
      .then(() => {
        setIsAuthenticated(true);
        setIsValidating(false);
      })
      .catch(() => {
        // Token is invalid, remove it
        localStorage.removeItem('access_token');
        setIsValidating(false);
      });
  }, []);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" />;
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
      
      <Route path="/onboarding" element={
        <PrivateRoute>
          <Onboarding />
        </PrivateRoute>
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
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;
