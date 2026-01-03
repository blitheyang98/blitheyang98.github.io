import axios from 'axios';
import { storage } from './storage';

// Use environment variable or detect localhost for development
const getApiUrl = () => {
  // Priority 1: Runtime window variable (set in _app.tsx)
  if (typeof window !== 'undefined' && (window as any).__NEXT_PUBLIC_API_URL__) {
    const url = (window as any).__NEXT_PUBLIC_API_URL__;
    console.log('Using API URL from window:', url);
    return url;
  }
  
  // Priority 2: Build-time environment variable (for GitHub Pages)
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('Using API URL from env:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Priority 3: For local development, detect localhost
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('Using localhost API URL for development');
      return 'http://localhost:5001/api';
    }
    
    // If on GitHub Pages but no API URL set, show error
    if (origin.includes('github.io')) {
      console.error('NEXT_PUBLIC_API_URL not set! Please configure GitHub Secrets and redeploy.');
      alert('API URL not configured. Please check GitHub Secrets and redeploy.');
    }
  }
  
  // Fallback
  console.warn('NEXT_PUBLIC_API_URL not set, using localhost fallback');
  return 'http://localhost:5001/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = storage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

