import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeAuth,
  getReactNativePersistence,
  browserSessionPersistence,
} from 'firebase/auth';

// Firebase config
const firebaseConfig = {
  apiKey: Constants.expoConfig.extra.apiKey,
  authDomain: Constants.expoConfig.extra.authDomain,
  projectId: Constants.expoConfig.extra.projectId,
  storageBucket: Constants.expoConfig.extra.storageBucket,
  messagingSenderId: Constants.expoConfig.extra.messagingSenderId,
  appId: Constants.expoConfig.extra.appId,
  databaseURL: Constants.expoConfig.extra.databaseURL,
  measurementId: Constants.expoConfig.extra.measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Basic sanity-check: warn if any important config values are missing
const requiredKeys = ['apiKey', 'projectId', 'appId'];
const missing = requiredKeys.filter((k) => !firebaseConfig[k]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(
    `Firebase config missing keys: ${missing.join(', ')}. This can cause Firestore connection failures.`
  );
}

const persistence =
  Platform.OS === 'web'
    ? browserSessionPersistence
    : getReactNativePersistence(ReactNativeAsyncStorage);

export const auth = initializeAuth(app, { persistence });

// Use the initialized app instance explicitly — helps avoid ambiguous default app issues
export const database = getFirestore(app);
