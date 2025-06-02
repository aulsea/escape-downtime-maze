import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.intelssoft.zephyruschallenge',
  appName: 'Zephyrus Challenge',
  webDir: './',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  ios: {
    scheme: 'Zephyrus Challenge',
    backgroundColor: '#0a0a0a',
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true,
    scrollEnabled: false,
    contentInset: 'never',
    handleApplicationNotifications: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a0a'
    },
    Keyboard: {
      resize: 'ionic'
    }
  }
};

export default config; 