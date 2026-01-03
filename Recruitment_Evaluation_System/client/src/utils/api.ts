import axios from 'axios';
import { storage } from './storage';

// Use environment variable or detect localhost for development
const getApiUrl = () => {
  // Priority: NEXT_PUBLIC_API_URL (for production/GitHub Pages)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // For local development, detect localhost
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:5001/api';
    }
  }
  
  // Fallback
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

