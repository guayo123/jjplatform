import { LocalNotifications } from '@capacitor/local-notifications';
import { getPlatformInfo } from './usePlatform';

// One notification id per upcoming day. Reusing 1001 overwrites the legacy daily reminder.
const STREAK_REMINDER_IDS = [1001, 1002, 1003];

// User-tweakable reminder preferences (device-local, since the notifications are too).
const PREFS_ENABLED_KEY = 'jjp_reminder_enabled';
const PREFS_HOUR_KEY = 'jjp_reminder_hour';
const DEFAULT_REMINDER_HOUR = 19;

export interface ReminderPrefs {
  enabled: boolean;
  /** Hour of day (0-23) the daily reminder fires. */
  hour: number;
}

export function getReminderPrefs(): ReminderPrefs {
  const enabledRaw = localStorage.getItem(PREFS_ENABLED_KEY);
  const hourRaw = Number(localStorage.getItem(PREFS_HOUR_KEY));
  return {
    enabled: enabledRaw == null ? true : enabledRaw === '1', // default on
    hour: Number.isInteger(hourRaw) && hourRaw >= 0 && hourRaw <= 23 ? hourRaw : DEFAULT_REMINDER_HOUR,
  };
}

export function setReminderPrefs(prefs: ReminderPrefs): void {
  localStorage.setItem(PREFS_ENABLED_KEY, prefs.enabled ? '1' : '0');
  localStorage.setItem(PREFS_HOUR_KEY, String(prefs.hour));
}

/** Ask for local-notification permission. Returns true if granted. No-op on web. */
export async function ensureLocalNotificationPermission(): Promise<boolean> {
  if (!getPlatformInfo().isNative) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
}

/** Lost-streak rescue state, when the student can still repair a 1-day gap. */
export interface StreakRescue {
  /** Length of the streak that just broke (0 = nothing to recover). */
  lostStreak: number;
  /** Whether a repair can still be spent this month. */
  repairAvailable: boolean;
}

/** Title/body tailored to the streak and how far out the reminder is. */
function streakReminderCopy(streak: number, dayOffset: number, rescue?: StreakRescue): { title: string; body: string } {
  // A broken streak that's still repairable: today's reminder becomes a rescue call.
  // Only day 0 — the repair window closes if today also passes untrained.
  if (dayOffset === 0 && rescue?.repairAvailable && rescue.lostStreak > 0) {
    return {
      title: `🚑 Salva tu racha de ${rescue.lostStreak} día${rescue.lostStreak === 1 ? '' : 's'}`,
      body: 'Aún estás a tiempo: entra y usa tu recuperación del mes. ¡No la dejes ir!',
    };
  }
  // Day 2+: the student likely hasn't reopened the app — switch to gentle re-engagement.
  if (dayOffset >= 2) {
    return {
      title: 'Te extrañamos en el tatami 🥋',
      body: streak > 0
        ? 'Tu racha se enfrió. Vuelve hoy y arranca una nueva. ¡Tú puedes!'
        : '¿Volvemos a entrenar? Registra una sesión y arranca tu racha.',
    };
  }
  if (streak > 0) {
    const d = `${streak} día${streak === 1 ? '' : 's'} seguido${streak === 1 ? '' : 's'}`;
    return {
      title: '🔥 Tu racha está en juego',
      body: `Llevas ${d}. Entrena hoy para no romperla.`,
    };
  }
  return {
    title: '🥋 ¿Listo para el tatami?',
    body: 'Registra un entreno y arranca tu racha de días.',
  };
}

/**
 * (Re)schedule a short ladder of evening reminders tailored to the student's streak.
 * Call it on app open and after logging a session so the copy always reflects the latest
 * state and an already-trained day never nags. Each call overwrites the previous ladder.
 * No-op on web.
 */
export async function scheduleStreakReminders(
  currentStreak: number,
  trainedToday: boolean,
  rescue?: StreakRescue,
): Promise<void> {
  if (!getPlatformInfo().isNative) return;
  const prefs = getReminderPrefs();
  if (!prefs.enabled) {
    await cancelStreakReminders(); // user turned reminders off
    return;
  }
  const granted = await ensureLocalNotificationPermission();
  if (!granted) return;
  try {
    // Clear the previous ladder first so stale copy never fires.
    await LocalNotifications.cancel({ notifications: STREAK_REMINDER_IDS.map((id) => ({ id })) });

    const now = new Date();
    const reminders = STREAK_REMINDER_IDS
      .map((id, dayOffset) => {
        const at = new Date(now);
        at.setDate(now.getDate() + dayOffset);
        at.setHours(prefs.hour, 0, 0, 0);
        return { id, at, dayOffset };
      })
      // Drop today's reminder if the evening already passed or they already trained today.
      .filter((r) => r.at.getTime() > now.getTime() && !(r.dayOffset === 0 && trainedToday));

    if (reminders.length === 0) return;

    await LocalNotifications.schedule({
      notifications: reminders.map((r) => ({
        id: r.id,
        ...streakReminderCopy(currentStreak, r.dayOffset, rescue),
        schedule: { at: r.at, allowWhileIdle: true },
      })),
    });
  } catch {
    /* scheduling failed — non-critical */
  }
}

/**
 * Fire an immediate local notification (e.g. "X accepted your challenge"). No-op on web.
 * Best-effort: silently does nothing if permission isn't granted.
 */
export async function notifyNow(title: string, body: string): Promise<void> {
  if (!getPlatformInfo().isNative) return;
  const granted = await ensureLocalNotificationPermission();
  if (!granted) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          // Random high id so it never collides with the daily reminder slot.
          id: 2000 + Math.floor(Math.random() * 100000),
          title,
          body,
        },
      ],
    });
  } catch {
    /* non-critical */
  }
}

/** Cancel the streak reminder ladder (e.g. on logout). No-op on web. */
export async function cancelStreakReminders(): Promise<void> {
  if (!getPlatformInfo().isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: STREAK_REMINDER_IDS.map((id) => ({ id })) });
  } catch {
    /* ignore */
  }
}
