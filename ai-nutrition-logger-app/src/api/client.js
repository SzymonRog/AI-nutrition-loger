import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

// Accept VITE_API_URL as either the backend origin or origin + "/api/v1".
// Normalize so the base always ends with the API prefix exactly once.
function resolveApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
  return /\/api\/v1$/.test(raw) ? raw : `${raw}/api/v1`;
}

const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject the current Supabase access token on every request.
apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the Supabase session and send the user back to login.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  register: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },
  logout: async () => {
    await supabase.auth.signOut();
  },
  updateProfile: async (data) => {
    const response = await apiClient.put('/users/me', data);
    return response.data;
  },
};

export const mealService = {
  processText: async (meal_text, meal_type) => {
    const response = await apiClient.post('/meals/text', { meal_text, meal_type });
    return response.data;
  },
  processImage: async (file, meal_type, meal_description = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('meal_type', meal_type);
    if (meal_description) {
      formData.append('meal_description', meal_description);
    }

    const response = await apiClient.post('/meals/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getMealsByDate: async (target_date) => {
    const response = await apiClient.get(`/meals/date/${target_date}`);
    return response.data;
  },
  getHistory: async (limit = 50) => {
    const response = await apiClient.get('/meals/history', { params: { limit } });
    return response.data;
  },
  updateMealTotals: async (meal_id, totals) => {
    const response = await apiClient.put(`/meals/${meal_id}/totals`, totals);
    return response.data;
  },
  deleteMeal: async (meal_id) => {
    const response = await apiClient.delete(`/meals/${meal_id}`);
    return response.data;
  },
};

export function getErrorMessage(err, fallback = 'Something went wrong') {
  // Supabase auth errors surface as Error objects with a message.
  if (err?.message && !err?.response) return err.message;

  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msg = detail.map((d) => (d && d.msg) ? d.msg : String(d)).filter(Boolean).join(', ');
    return msg || fallback;
  }
  return fallback;
}
