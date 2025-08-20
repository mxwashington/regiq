import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.17967fd3c5a04356a144f39563d94aba',
  appName: 'regiq',
  webDir: 'dist',
  server: {
    url: 'https://17967fd3-c5a0-4356-a144-f39563d94aba.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;