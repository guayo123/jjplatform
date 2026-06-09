import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jjplatform.app',
  appName: 'JJPlatform',
  webDir: 'dist',
  // Dev opcional: descomenta y apunta a la IP de tu equipo en la LAN para live-reload en dispositivo.
  // server: { url: 'http://192.168.1.100:5173', cleartext: true },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#111827',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
