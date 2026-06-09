import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8081/api';

// In-memory token so the request interceptor stays synchronous even when the
// persisted token lives in native storage (Preferences is async). The auth store
// sets this on hydrate/login and clears it on logout.
let inMemoryToken: string | null = null;
export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if available
client.interceptors.request.use((config) => {
  const token = inMemoryToken ?? localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to the right login for the current area
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      inMemoryToken = null;
      localStorage.removeItem('token');
      // Students (web portal and the native app) belong to /portal/login; staff to /login.
      const portal = window.location.pathname.startsWith('/portal');
      window.location.href = portal ? '/portal/login' : '/login';
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
