/**
 * User service — create/lookup users in Firestore.
 * Falls back to in-memory if Firebase not available.
 */
import { isFirebaseAvailable, getDB } from './firebase-admin';

export interface FirestoreUser {
  id: string;
  name: string;
  phone: string;
  role: 'user' | 'provider';
  fcm_token?: string;
  created_at: string;
  updated_at: string;
  provider_profile?: Record<string, any>;
}

const _users = new Map<string, FirestoreUser>();

export async function getOrCreateUser(id: string, name: string, phone: string, role: 'user' | 'provider'): Promise<FirestoreUser> {
  // Check in-memory first
  if (_users.has(id)) return _users.get(id)!;

  // Check Firestore
  if (isFirebaseAvailable()) {
    try {
      const doc = await getDB().collection('users').doc(id).get();
      if (doc.exists) {
        const user = doc.data() as FirestoreUser;
        _users.set(id, user);
        console.log(`👤 User loaded from Firestore: ${user.name}`);
        return user;
      }
    } catch (e) {
      console.warn('Firestore user lookup failed');
    }
  }

  // Create new user
  const user: FirestoreUser = {
    id, name, phone, role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  _users.set(id, user);

  // Persist to Firestore (non-blocking)
  if (isFirebaseAvailable()) {
    getDB().collection('users').doc(id).set(user).then(() => {
      console.log(`✅ User saved to Firestore: ${name} (${role})`);
    }).catch(() => {});
  }

  return user;
}

export async function updateUserProviderProfile(userId: string, profile: Record<string, any>): Promise<void> {
  const user = _users.get(userId);
  if (user) {
    user.provider_profile = profile;
    user.updated_at = new Date().toISOString();
    _users.set(userId, user);
  }

  if (isFirebaseAvailable()) {
    getDB().collection('users').doc(userId).update({
      provider_profile: profile,
      updated_at: new Date().toISOString(),
    }).catch(() => {});
  }
}

export async function updateFCMToken(userId: string, token: string): Promise<void> {
  if (isFirebaseAvailable()) {
    getDB().collection('users').doc(userId).update({ fcm_token: token, updated_at: new Date().toISOString() }).catch(() => {});
  }
}
