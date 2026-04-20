import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8081/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    // Extract user-friendly message from API response body
    const apiMessage =
      error.response?.data?.message ??
      error.response?.data?.errors ??
      error.message;
    const message = typeof apiMessage === 'object' ? JSON.stringify(apiMessage) : String(apiMessage);
    return Promise.reject(new Error(message));
  }
);

export default client;
