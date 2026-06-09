import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { getPlatformInfo } from './usePlatform';

/**
 * Thin, safe wrappers around @capacitor/haptics. They no-op on web and swallow
 * errors so a missing/declined haptics capability never breaks a user action.
 */
export async function tapLight() {
  if (!getPlatformInfo().isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* haptics unavailable — ignore */
  }
}

export async function tapMedium() {
  if (!getPlatformInfo().isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* ignore */
  }
}

export async function tapHeavy() {
  if (!getPlatformInfo().isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    /* ignore */
  }
}

export async function notifySuccess() {
  if (!getPlatformInfo().isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* ignore */
  }
}
