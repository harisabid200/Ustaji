import admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';
import { Messaging } from 'firebase-admin/messaging';
import path from 'path';

let _db: Firestore | null = null;
let _messaging: Messaging | null = null;
let _initialized = false;

export function initFirebase(): void {
  if (_initialized) return;

  try {
    let serviceAccount: any;
    
    // Cloud/Production: Read from base64 env var
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
    } 
    // Local Development: Read from JSON file
    else {
      serviceAccount = require(path.resolve(__dirname, '../../firebase-service-account.json'));
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    _db = admin.firestore();
    _messaging = admin.messaging();
    _initialized = true;
    console.log(`✅ Firebase Admin initialized → project: ${serviceAccount.project_id}`);
  } catch (e: any) {
    console.error('❌ Firebase Admin init failed:', e.message);
    console.warn('   Sessions/bookings will use in-memory storage (data lost on restart).');
  }
}

export function getDB(): Firestore {
  if (!_db) throw new Error('Firebase not initialized');
  return _db;
}

export function getMessaging(): Messaging {
  if (!_messaging) throw new Error('Firebase Messaging not initialized');
  return _messaging;
}

export function isFirebaseAvailable(): boolean {
  return _initialized && _db !== null;
}
