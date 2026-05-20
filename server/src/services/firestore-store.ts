/**
 * Firestore-backed session and booking store.
 * Falls back to in-memory Map if Firebase is not initialized.
 */
import { isFirebaseAvailable, getDB } from './firebase-admin';
import { ChatSession, Booking } from '../utils/types';

// ── In-memory fallbacks ────────────────────────────────────────
const _sessions = new Map<string, ChatSession>();
const _bookings = new Map<string, Booking>();

/** Strip undefined values recursively — Firestore rejects undefined fields */
function sanitize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ── Session CRUD ──────────────────────────────────────────────

export async function saveSession(session: ChatSession): Promise<void> {
  if (isFirebaseAvailable()) {
    await getDB().collection('sessions').doc(session.id).set(sanitize(session));
  } else {
    _sessions.set(session.id, session);
  }
}


export async function fetchSession(id: string): Promise<ChatSession | null> {
  if (isFirebaseAvailable()) {
    const doc = await getDB().collection('sessions').doc(id).get();
    return doc.exists ? (doc.data() as ChatSession) : null;
  }
  return _sessions.get(id) || null;
}

export function getSessionSync(id: string): ChatSession | undefined {
  return _sessions.get(id);
}

export function setSessionSync(id: string, session: ChatSession): void {
  _sessions.set(id, session);
}

// ── Booking CRUD ──────────────────────────────────────────────

export async function saveBooking(booking: Booking): Promise<void> {
  if (isFirebaseAvailable()) {
    await getDB().collection('bookings').doc(booking.id).set(sanitize(booking));
  } else {
    _bookings.set(booking.id, booking);
  }
}

export async function fetchBooking(id: string): Promise<Booking | null> {
  if (isFirebaseAvailable()) {
    const doc = await getDB().collection('bookings').doc(id).get();
    return doc.exists ? (doc.data() as Booking) : null;
  }
  return _bookings.get(id) || null;
}

export async function fetchUserBookings(userId: string): Promise<Booking[]> {
  if (isFirebaseAvailable()) {
    const snap = await getDB()
      .collection('bookings')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();
    return snap.docs.map(d => d.data() as Booking);
  }
  return Array.from(_bookings.values()).filter(b => b.user_id === userId);
}

export async function updateBooking(id: string, fields: Partial<Booking>): Promise<boolean> {
  if (isFirebaseAvailable()) {
    const ref = getDB().collection('bookings').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.update({ ...fields, updated_at: new Date().toISOString() });
    return true;
  }
  const existing = _bookings.get(id);
  if (!existing) return false;
  _bookings.set(id, { ...existing, ...fields, updated_at: new Date().toISOString() });
  return true;
}

// Direct in-memory map access (for supervisor backward-compat)
export function getBookingSync(id: string): Booking | undefined {
  return _bookings.get(id);
}

export function setBookingSync(id: string, booking: Booking): void {
  _bookings.set(id, booking);
}

export function getAllBookingsSync(userId: string): Booking[] {
  if (userId === '*') return Array.from(_bookings.values());
  return Array.from(_bookings.values()).filter(b => b.user_id === userId);
}

// ── Scheduling queries ─────────────────────────────────────────

/**
 * Get all confirmed/in-progress bookings for a provider on a given date (YYYY-MM-DD).
 * Used by SchedulingAgent to detect conflicts and calculate free slots.
 */
export async function getProviderBookingsForDay(
  providerId: string,
  date: string,
): Promise<Booking[]> {
  // In-memory first (fast path for the same server session)
  const inMem = Array.from(_bookings.values()).filter(b =>
    b.provider_id === providerId &&
    b.scheduled_time.startsWith(date) &&
    !['cancelled', 'disputed'].includes(b.status)
  );
  if (inMem.length > 0) return inMem;

  if (isFirebaseAvailable()) {
    try {
      const snap = await getDB()
        .collection('bookings')
        .where('provider_id', '==', providerId)
        .where('status', 'in', ['confirmed', 'provider_en_route', 'in_progress', 'delayed', 'rescheduled'])
        .get();
      return snap.docs
        .map(d => d.data() as Booking)
        .filter(b => b.scheduled_time.startsWith(date));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Add a user to a provider's waitlist for a given service + date.
 * Stored as a subcollection on the provider document.
 */
export async function addToWaitlist(
  providerId: string,
  userId: string,
  serviceType: string,
  requestedDate: string,
): Promise<number> {
  if (!isFirebaseAvailable()) return 1;
  try {
    const ref = getDB()
      .collection('providers').doc(providerId)
      .collection('waitlist');
    const snap = await ref.where('date', '==', requestedDate).where('service', '==', serviceType).get();
    const position = snap.size + 1;
    await ref.add({
      user_id: userId, service: serviceType, date: requestedDate,
      position, created_at: new Date().toISOString(),
    });
    return position;
  } catch {
    return 1;
  }
}

