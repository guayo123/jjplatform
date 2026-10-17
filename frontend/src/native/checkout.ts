import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { getPlatformInfo } from './usePlatform';

/**
 * Opens a payment checkout. In the native app it uses the in-app browser (Custom Tab) so the
 * student never leaves the app; on the web it opens a new tab.
 */
export async function openCheckout(url: string): Promise<void> {
  if (getPlatformInfo().isNative) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Calls back when the gateway redirects to jjplatform://pagos (end of checkout) and closes the
 * in-app browser. Returns the unsubscribe function.
 */
export function onCheckoutReturn(cb: () => void): () => void {
  if (!getPlatformInfo().isNative) return () => {};
  const handle = App.addListener('appUrlOpen', (e) => {
    if (!e.url.startsWith('jjplatform://pagos')) return;
    void Browser.close().catch(() => {});
    cb();
  });
  return () => { void handle.then((h) => h.remove()); };
}
