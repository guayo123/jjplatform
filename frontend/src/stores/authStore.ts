import { create } from 'zustand';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  token: string | null;
  email: string | null;
  academyId: number | null;
  academyName: string | null;
  role: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

function loadFromStorage(): Partial<AuthState> {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const res = JSON.parse(stored);
      return {
        token: res.token,
        email: res.email,
        academyId: res.academyId,
        academyName: res.academyName,
        role: res.role ?? null,
        isAuthenticated: true,
      };
    }
  } catch {
    localStorage.removeItem('auth');
    localStorage.removeItem('token');
  }
  return {};
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  email: null,
  academyId: null,
  academyName: null,
  role: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  ...loadFromStorage(),

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(data);
      localStorage.setItem('token', res.token);
      localStorage.setItem('auth', JSON.stringify(res));
      set({
        token: res.token,
        email: res.email,
        academyId: res.academyId,
        academyName: res.academyName,
        role: res.role,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.register(data);
      localStorage.setItem('token', res.token);
      localStorage.setItem('auth', JSON.stringify(res));
      set({
        token: res.token,
        email: res.email,
        academyId: res.academyId,
        academyName: res.academyName,
        role: res.role,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth');
    set({
      token: null,
      email: null,
      academyId: null,
      academyName: null,
      role: null,
      isAuthenticated: false,
    });
  },

  hydrate: () => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        const res = JSON.parse(stored);
        set({
          token: res.token,
          email: res.email,
          academyId: res.academyId,
          academyName: res.academyName,
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem('auth');
        localStorage.removeItem('token');
      }
    }
  },
}));
