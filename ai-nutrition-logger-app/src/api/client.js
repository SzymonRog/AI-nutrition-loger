import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to inject the token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },
  register: async (email, password, daily_calorie_goal = 2000) => {
    const response = await apiClient.post('/auth/register', { email, password, daily_calorie_goal });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
  }
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
  deleteMeal: async (meal_id) => {
    const response = await apiClient.delete(`/meals/${meal_id}`);
    return response.data;
  }
};
