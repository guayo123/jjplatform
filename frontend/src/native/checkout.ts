import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { getPlatformInfo } from './usePlatform';

/**
 * Opens an external URL (a payment checkout, a WhatsApp link). In the native app it uses the
 * in-app browser (Custom Tab) so the student never leaves the app; on the web it opens a new tab.
 */
export async function openExternal(url: string): Promise<void> {
  if (getPlatformInfo().isNative) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}

/** Opens a payment checkout (see {@link openExternal}). */
export const openCheckout = openExternal;

/**
 * Calls back when the gateway redirects to jjplatform://pagos (end of checkout) and closes the
 * in-app browser. The callback gets the full deep link (it may carry ?pago=&alumno=, see
 * {@link parsePayReturn}). Returns the unsubscribe function.
 */
export function onCheckoutReturn(cb: (url: string) => void): () => void {
  if (!getPlatformInfo().isNative) return () => {};
  const handle = App.addListener('appUrlOpen', (e) => {
    if (!e.url.startsWith('jjplatform://pagos')) return;
    void Browser.close().catch(() => {});
    cb(e.url);
  });
  return () => { void handle.then((h) => h.remove()); };
}

const VIEW_KEY = 'jjp_checkout_native_view';

/**
 * Remembers whether the portal is in the tabbed "app" preview (?native=1) when a checkout starts,
 * so the web return (which lands on a plain /portal?pago=…) reopens the same view.
 */
export function rememberCheckoutView(): void {
  try {
    if (new URLSearchParams(window.location.search).has('native')) localStorage.setItem(VIEW_KEY, '1');
    else localStorage.removeItem(VIEW_KEY);
  } catch { /* storage unavailable */ }
}

/** True when the checkout being returned from was started from the ?native=1 preview. */
export function checkoutStartedInNativeView(): boolean {
  try {
    return localStorage.getItem(VIEW_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Reads the payment + student the checkout return points at (`?pago=<id>&alumno=<id>`), from a
 * deep link or a web query string. Null when absent (older backends return without them).
 */
export function parsePayReturn(urlOrSearch: string): { paymentId: number; studentId: number } | null {
  const q = urlOrSearch.includes('?') ? urlOrSearch.slice(urlOrSearch.indexOf('?')) : urlOrSearch;
  const params = new URLSearchParams(q);
  const paymentId = Number(params.get('pago'));
  const studentId = Number(params.get('alumno'));
  return paymentId > 0 && studentId > 0 ? { paymentId, studentId } : null;
}
