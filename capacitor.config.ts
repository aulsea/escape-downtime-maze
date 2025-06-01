import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zephyrus.challenge',
  appName: 'Zephyrus Challenge',
  webDir: '.',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: '#111111'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#111111',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#111111'
    }
  }
};

export default config; 