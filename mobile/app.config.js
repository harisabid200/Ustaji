// app.config.js — Dynamic Expo config that reads environment variables.
// Replaces app.json so that EXPO_PUBLIC_API_URL is embedded at build time.

module.exports = {
  expo: {
    name: 'UstaJi',
    slug: 'ustaji',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#10B981',  // Brand emerald
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.ustaji.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#10B981',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.ustaji.app',
      googleServicesFile: './google-services.json',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      // Makes the API URL available via expo-constants in older SDK versions
      apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
      eas: {
        projectId: 'your-eas-project-id',  // Set this after running: eas init
      },
    },
    plugins: [
      'expo-font',
    ],
  },
};
