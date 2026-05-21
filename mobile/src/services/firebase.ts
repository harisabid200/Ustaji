import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, getAuth } from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (guard against hot-reload re-init)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Persistence strategy:
//   Native (Android/iOS) → AsyncStorage (survives app restarts)
//   Web                  → localStorage via browserLocalPersistence
let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
} else {
  // Dynamically import to avoid TS module errors on web builds
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getReactNativePersistence } = require('firebase/auth');
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export { app, auth };

