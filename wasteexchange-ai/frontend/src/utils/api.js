// src/utils/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // ✅ 15s → 30s default
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ Auto-extend timeout for known slow endpoints
    const slowRoutes = [
      '/deals/',
      '/wallet/',
      '/payment/',
      '/listings/bids',
      '/requirements/',
    ];
    const url = config.url || '';
    const isSlow = slowRoutes.some((r) => url.includes(r)) &&
      (config.method === 'put' || config.method === 'post');

    if (isSlow && !config.timeout) {
      config.timeout = 60000; // 60s for these
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — better error info
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tag timeout errors so callers can handle them specially
    if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
      error.isTimeout = true;
    }
    return Promise.reject(error);
  }
);

export default API;