import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { getPlatformInfo } from './usePlatform';

/**
 * Handle the Android hardware back button:
 *  - On a "root" screen (portal home or a login), exit the app.
 *  - Otherwise, navigate back in the in-app history.
 *
 * No-op on web and iOS. Mount once, inside the Router.
 */
const ROOT_PATHS = new Set(['/portal', '/portal/login', '/']);

export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!getPlatformInfo().isAndroid) return;

    const handle = App.addListener('backButton', () => {
      if (ROOT_PATHS.has(location.pathname)) {
        App.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      void handle.then((h) => h.remove());
    };
  }, [location.pathname, navigate]);
}
