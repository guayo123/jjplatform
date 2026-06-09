import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { ToastProvider } from './components/ToastContext';
import { ConfirmProvider } from './components/ConfirmContext';
import { useAuthStore } from './stores/authStore';
import './index.css';

async function bootstrap() {
  // Restore the persisted session before the first paint so the app starts on the
  // right screen (no flash of the login on a logged-in launch). On native this reads
  // from Preferences (async); on web from localStorage.
  await useAuthStore.getState().hydrate();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>
  );

  // Hide the native splash once the UI is mounted.
  if (Capacitor.isNativePlatform()) {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    void SplashScreen.hide();
  }
}

void bootstrap();
