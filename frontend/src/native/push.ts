import { PushNotifications } from '@capacitor/push-notifications';
import { getPlatformInfo } from './usePlatform';

/**
 * Push notifications — SCAFFOLDING ONLY (fase 2).
 *
 * This registers for push and wires the listeners, but actually delivering remote
 * pushes still requires backend work that does not exist yet:
 *   - A Firebase project (FCM) for Android + APNs credentials for iOS.
 *   - A backend endpoint to store device tokens, e.g. POST /api/portal/devices.
 *   - A backend service that sends pushes via FCM/APNs.
 *
 * TODO(fase 2): when the endpoint exists, send `token` from the 'registration'
 * listener to the backend so the server can target this device.
 */
export async function registerPush(): Promise<void> {
  if (!getPlatformInfo().isNative) return;
  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    await PushNotifications.addListener('registration', (token) => {
      // TODO(fase 2): POST token.value to /api/portal/devices
      // eslint-disable-next-line no-console
      console.debug('[push] device token', token.value);
    });

    await PushNotifications.addListener('registrationError', (err) => {
      // eslint-disable-next-line no-console
      console.warn('[push] registration error', err);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // eslint-disable-next-line no-console
      console.debug('[push] received', notification);
    });
  } catch {
    /* push unavailable — non-critical */
  }
}
