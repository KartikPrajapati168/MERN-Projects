import axios from 'axios';

// Get the base URL from environment or use default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const API = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to headers
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - please check your network');
    } else if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (!error.response) {
      // Network error - server not reachable
      console.error('Server is not reachable. Please check if backend is running.');
    }
    
    return Promise.reject(error);
  }
);

export default API;