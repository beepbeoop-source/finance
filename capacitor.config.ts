import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syedglobal.finance',
  appName: 'Syed Global Finance',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
