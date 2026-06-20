import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

/**
 * Thin wrapper over @aparajita/capacitor-biometric-auth so the rest of the app doesn't
 * depend on the plugin's API directly. Used to gate the saved-credentials auto-login
 * behind the device's fingerprint / Face ID.
 */
export interface BiometryInfo {
  /** Device has biometry hardware AND the user has enrolled at least one. */
  available: boolean;
  /** Human label for buttons, e.g. "huella", "Face ID". */
  label: string;
}

function labelFor(type: BiometryType): string {
  switch (type) {
    case BiometryType.faceId:
      return 'Face ID';
    case BiometryType.touchId:
      return 'Touch ID';
    case BiometryType.faceAuthentication:
      return 'reconocimiento facial';
    case BiometryType.irisAuthentication:
      return 'iris';
    case BiometryType.fingerprintAuthentication:
      return 'huella';
    default:
      return 'biometría';
  }
}

/** One native round-trip: whether biometry is usable now and a label for the UI. */
export async function getBiometry(): Promise<BiometryInfo> {
  if (!Capacitor.isNativePlatform()) return { available: false, label: 'biometría' };
  try {
    const r = await BiometricAuth.checkBiometry();
    return { available: r.isAvailable, label: labelFor(r.biometryType) };
  } catch {
    return { available: false, label: 'biometría' };
  }
}

/**
 * Prompt the device biometric dialog. Resolves true on success, false on any
 * failure/cancel (never throws), so callers can branch simply.
 */
export async function verifyBiometric(reason: string): Promise<boolean> {
  try {
    await BiometricAuth.authenticate({
      reason,
      androidTitle: 'Verifica tu identidad',
      androidSubtitle: 'Usa tu huella o rostro para ingresar',
      cancelTitle: 'Usar contraseña',
      // Fall back to the device PIN/pattern if biometry fails — still better than plaintext.
      allowDeviceCredential: true,
    });
    return true;
  } catch {
    return false;
  }
}
