import { PushNotifications } from '@capacitor/push-notifications';
import { getPlatformInfo } from './usePlatform';
import { devicesApi } from '../api/devices';

/**
 * Push notifications (FCM) for the native app. Registers for push, sends the device token to the
 * backend so the server can target the academy (duel confirmed / result), and wires the listeners.
 *
 * Gated behind VITE_ENABLE_PUSH: on Android, PushNotifications.register() calls into
 * FirebaseMessaging on a native background thread and throws IllegalStateException
 * ("Default FirebaseApp is not initialized") — crashing the app — when google-services.json /
 * a Firebase project isn't configured. Keep the flag off until Firebase is wired in the build.
 */
export async function registerPush(studentId: number): Promise<void> {
  if (!getPlatformInfo().isNative) return;
  if (import.meta.env.VITE_ENABLE_PUSH !== 'true') return;
  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    // Fresh listeners each call would stack up; clear any from a previous registration first.
    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', (token) => {
      devicesApi
        .register(studentId, token.value, getPlatformInfo().platform)
        .catch(() => { /* token sync is best-effort; retried next app open */ });
    });

    await PushNotifications.addListener('registrationError', (err) => {
      // eslint-disable-next-line no-console
      console.warn('[push] registration error', err);
    });
  } catch {
    /* push unavailable — non-critical */
  }
}
