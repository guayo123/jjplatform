import { Capacitor } from '@capacitor/core';

export type RuntimePlatform = 'ios' | 'android' | 'web';

export interface PlatformInfo {
  /** True inside the Capacitor native app (iOS/Android), false on the website. */
  isNative: boolean;
  platform: RuntimePlatform;
  isIOS: boolean;
  isAndroid: boolean;
}

// The runtime platform never changes during a session, so compute it once.
const info: PlatformInfo = (() => {
  const platform = Capacitor.getPlatform() as RuntimePlatform;
  return {
    isNative: Capacitor.isNativePlatform(),
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
  };
})();

/** Central hook to branch the UI by execution context (app vs web). */
export function usePlatform(): PlatformInfo {
  return info;
}

/** Non-hook accessor for use outside React components. */
export function getPlatformInfo(): PlatformInfo {
  return info;
}
