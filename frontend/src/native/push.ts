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
  const platform = getPlatformInfo().platform;
  // Debug events (best-effort) so we can see in Railway exactly where push registration stops.
  const log = (event: string, detail?: string) => { void devicesApi.clientLog(studentId, event, detail).catch(() => {}); };
  log('push_start', platform);
  try {
    const perm = await PushNotifications.requestPermissions();
    log('push_permission', perm.receive);
    if (perm.receive !== 'granted') return;

    // Attach the listeners BEFORE register(): register() can emit the 'registration' token event
    // immediately, and a listener added afterwards misses it — so that device never sends its token
    // to the backend and never receives pushes. (Race that left some students out of notifications.)
    // Fresh listeners each call would stack up; clear any from a previous registration first.
    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', (token) => {
      log('push_token_received', platform);
      devicesApi
        .register(studentId, token.value, platform)
        .then(() => log('push_register_ok', platform))
        .catch(() => log('push_register_fail', platform)); // token sync is best-effort; retried next app open
    });

    await PushNotifications.addListener('registrationError', (err) => {
      log('push_registration_error', String(err?.error ?? err));
    });

    await PushNotifications.register();
  } catch (e) {
    log('push_exception', String(e));
  }
}
