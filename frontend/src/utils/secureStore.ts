import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

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
