import { create } from 'zustand';
import { authApi } from '../api/auth';
import { setAuthToken } from '../api/client';
import { storeGet, storeSet, storeRemove } from '../utils/secureStore';
import type { LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  token: string | null;
  email: string | null;
  academyId: number | null;
  academyName: string | null;
  role: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  loading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  markPasswordChanged: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  email: null,
  academyId: null,
  academyName: null,
  role: null,
  isAuthenticated: false,
  mustChangePassword: false,
  loading: false,
  error: null,

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(data);
      setAuthToken(res.token);
      await storeSet('token', res.token);
      await storeSet('auth', JSON.stringify(res));
      set({
        token: res.token,
        email: res.email,
        academyId: res.academyId,
        academyName: res.academyName,
        role: res.role,
        mustChangePassword: !!res.mustChangePassword,
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
      setAuthToken(res.token);
      await storeSet('token', res.token);
      await storeSet('auth', JSON.stringify(res));
      set({
        token: res.token,
        email: res.email,
        academyId: res.academyId,
        academyName: res.academyName,
        role: res.role,
        mustChangePassword: !!res.mustChangePassword,
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
    // Clear session state immediately; persisted storage is cleared best-effort.
    setAuthToken(null);
    set({
      token: null,
      email: null,
      academyId: null,
      academyName: null,
      role: null,
      isAuthenticated: false,
      mustChangePassword: false,
    });
    void storeRemove('token');
    void storeRemove('auth');
  },

  hydrate: async () => {
    try {
      const stored = await storeGet('auth');
      if (!stored) return;
      const res = JSON.parse(stored);
      setAuthToken(res.token);
      set({
        token: res.token,
        email: res.email,
        academyId: res.academyId,
        academyName: res.academyName,
        role: res.role ?? null,
        mustChangePassword: !!res.mustChangePassword,
        isAuthenticated: true,
      });
    } catch {
      await storeRemove('auth');
      await storeRemove('token');
    }
  },

  markPasswordChanged: () => {
    void (async () => {
      const stored = await storeGet('auth');
      if (stored) {
        try {
          const res = JSON.parse(stored);
          res.mustChangePassword = false;
          await storeSet('auth', JSON.stringify(res));
        } catch {
          // ignore: storage state will be refreshed on next login
        }
      }
    })();
    set({ mustChangePassword: false });
  },
}));
