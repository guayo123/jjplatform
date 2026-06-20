import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * Storage that survives across launches on every platform.
 *
 * - Native (iOS/Android): uses @capacitor/preferences, which is backed by native
 *   UserDefaults / SharedPreferences. More durable than the WebView's localStorage,
 *   which the OS can purge under storage pressure.
 * - Web: falls back to localStorage so the website behaves exactly as before.
 *
 * The API is async because Preferences is async; the in-memory token cache in
 * client.ts keeps the axios request interceptor synchronous.
 */
const native = Capacitor.isNativePlatform();

export async function storeGet(key: string): Promise<string | null> {
  if (native) return (await Preferences.get({ key })).value;
  return localStorage.getItem(key);
}

export async function storeSet(key: string, value: string): Promise<void> {
  if (native) await Preferences.set({ key, value });
  else localStorage.setItem(key, value);
}

export async function storeRemove(key: string): Promise<void> {
  if (native) await Preferences.remove({ key });
  else localStorage.removeItem(key);
}

/**
 * "Recordar mis datos" credentials for the student login. Stored so the app can
 * pre-fill email + password for faster sign-in; it is opt-in (the user ticks the
 * box) and cleared the moment they untick it or it fails to load.
 *
 * Unlike the session token, these are kept in encrypted secure storage
 * (`@aparajita/capacitor-secure-storage`) because a password is long-lived and
 * often reused elsewhere:
 *   - Android: EncryptedSharedPreferences, keyed by the hardware Android Keystore.
 *   - iOS: the Keychain.
 *   - Web: localStorage fallback (same as before — the browser offers no Keystore).
 */
const CREDS_KEY = 'student_creds';

export interface SavedCreds {
  email: string;
  password: string;
}

export async function getSavedCreds(): Promise<SavedCreds | null> {
  try {
    const raw = await SecureStorage.get(CREDS_KEY);
    if (typeof raw !== 'string') return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.email === 'string' && typeof parsed?.password === 'string') {
      return parsed;
    }
  } catch { /* fall through to clear */ }
  await clearSavedCreds();
  return null;
}

export async function saveCreds(creds: SavedCreds): Promise<void> {
  await SecureStorage.set(CREDS_KEY, JSON.stringify(creds));
}

export async function clearSavedCreds(): Promise<void> {
  try {
    await SecureStorage.remove(CREDS_KEY);
  } catch { /* nothing stored / already gone */ }
}
