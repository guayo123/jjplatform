import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { devicesApi } from '../api/devices';

interface BeltIconPlugin {
  setBelt(options: { belt: string }): Promise<void>;
}

const BeltIcon = registerPlugin<BeltIconPlugin>('BeltIcon');

/** The five app-icon options (one per belt color). `key` is what the native plugin expects. */
export const APP_ICON_OPTIONS = [
  { key: 'WHITE',  label: 'Blanco', color: '#E5E7EB' },
  { key: 'BLUE',   label: 'Azul',   color: '#2563EB' },
  { key: 'PURPLE', label: 'Morado', color: '#7C3AED' },
  { key: 'BROWN',  label: 'Café',   color: '#7C4A1E' },
  { key: 'BLACK',  label: 'Negro',  color: '#111827' },
] as const;

const ICON_KEY = 'jjp_app_icon';

/** The currently-chosen app icon (defaults to WHITE, the icon the app ships with). */
export function getChosenAppIcon(): string {
  return localStorage.getItem(ICON_KEY) ?? 'WHITE';
}

/**
 * Apply a chosen app icon.
 *
 * Swapping the launcher activity-alias tears down the running Activity, so this MUST be a deliberate,
 * user-initiated action (with a warning) — it is intentionally NOT called automatically on login.
 * Doing it on every login used to kill the webview mid-FCM-registration, so the device token never
 * reached the backend and the student never received push notifications.
 *
 * Persists the choice, swaps the icon, then closes the app so the launcher re-reads the new icon on
 * the next open (where push registration then completes cleanly, untouched).
 */
export async function applyAppIcon(belt: string, studentId?: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  localStorage.setItem(ICON_KEY, belt);
  // Debug log (best-effort) so we can see in Railway who changed their icon.
  if (studentId != null) void devicesApi.clientLog(studentId, 'icon_change', belt).catch(() => {});
  try {
    await BeltIcon.setBelt({ belt });
  } catch {
    /* non-fatal — icon stays as-is */
  }
  // Let the confirmation paint, then close so Android applies the new launcher icon.
  setTimeout(() => { void App.exitApp(); }, 700);
}
