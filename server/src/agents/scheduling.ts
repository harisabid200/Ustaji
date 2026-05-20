/**
 * Scheduling Agent — Phase 2
 *
 * Responsibilities:
 * 1. Conflict detection — checks provider's existing bookings for the day
 * 2. Travel-time buffers — ensures enough gap between consecutive jobs
 * 3. Slot generation — builds primary slot + 3 alternatives
 * 4. Auto-reschedule — if the primary provider cancels, assign the next best
 * 5. Waitlist management — adds user to waitlist if all slots full
 */
import { NLUResult, RankedProvider, SchedulingResult, TimeSlot, Booking, AgentTrace } from '../utils/types';
import { ComplexityClassification } from '../utils/types';
import { getProviderBookingsForDay, addToWaitlist } from '../services/firestore-store';
import { v4 as uuid } from 'uuid';

// Working hours by day (24h format start hour)
const WORKING_HOURS: Record<string, { open: number; close: number }> = {
  monday:    { open: 8,  close: 20 },
  tuesday:   { open: 8,  close: 20 },
  wednesday: { open: 8,  close: 20 },
  thursday:  { open: 8,  close: 20 },
  friday:    { open: 14, close: 20 }, // Jumu'ah — afternoon only
  saturday:  { open: 8,  close: 18 },
  sunday:    { open: 10, close: 16 },
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Time slot preference → preferred start hour
const SLOT_HOUR_MAP: Record<string, number> = {
  morning:   9,
  afternoon: 13,
  evening:   16,
  night:     19,
};

function pad(n: number): string { return n.toString().padStart(2, '0'); }
function toTimeStr(h: number, m = 0): string { return `${pad(h)}:${pad(m)}`; }
function parseHour(t: string): number { return parseInt(t.split(':')[0]); }

/** Convert urgency to target date */
function resolveTargetDate(nlu: NLUResult): Date {
  if (nlu.time_preference.specific_date) {
    return new Date(nlu.time_preference.specific_date);
  }
  const now = new Date();
  switch (nlu.time_preference.urgency) {
    case 'emergency':
    case 'today':     return now;
    case 'tomorrow':  return new Date(now.getTime() + 86400000);
    case 'this_week': return new Date(now.getTime() + 2 * 86400000);
    default:          return new Date(now.getTime() + 86400000); // default tomorrow
  }
}

/** Check if a proposed slot overlaps with an existing booking (including buffer) */
function hasConflict(
  proposedStart: number,
  proposedEnd: number,
  existingBookings: Booking[],
  bufferMinutes: number,
): boolean {
  for (const booking of existingBookings) {
    const bookedStart = parseHour(booking.scheduled_time.split(' ')[1] || '09:00');
    const bookedEnd = bookedStart + 1.5; // Assume ~90 min per job if no duration
    const bufferedStart = bookedStart - bufferMinutes / 60;
    const bufferedEnd = bookedEnd + bufferMinutes / 60;
    if (proposedStart < bufferedEnd && proposedEnd > bufferedStart) return true;
  }
  return false;
}

/** Get free slots for a provider on a given date */
function getFreeSlots(
  date: Date,
  provider: RankedProvider,
  existingBookings: Booking[],
  jobDurationHours: number,
  travelBufferMinutes: number,
): { hour: number; label: string }[] {
  const dayName = DAY_NAMES[date.getDay()];
  const hours = WORKING_HOURS[dayName] || { open: 9, close: 18 };
  const providerSlots = provider.provider.availability[dayName] || [];

  // If provider marked fully unavailable this day
  if (providerSlots.length === 0) return [];

  const free: { hour: number; label: string }[] = [];
  for (let h = hours.open; h <= hours.close - jobDurationHours; h++) {
    // Check provider's own availability windows
    const inWindow = providerSlots.some(slot => {
      const [start, end] = slot.split('-').map(parseHour);
      return h >= start && h + jobDurationHours <= end;
    });
    if (!inWindow) continue;

    // Check no conflict with existing bookings
    if (hasConflict(h, h + jobDurationHours, existingBookings, travelBufferMinutes)) continue;

    const label = h < 12 ? `Morning ${toTimeStr(h)}` : h < 17 ? `Afternoon ${toTimeStr(h)}` : `Evening ${toTimeStr(h)}`;
    free.push({ hour: h, label });
  }
  return free;
}

/** Build a TimeSlot object */
function makeSlot(date: Date, hour: number, provider: RankedProvider, durationHours: number): TimeSlot {
  const dateStr = date.toISOString().split('T')[0];
  return {
    date: dateStr,
    start_time: toTimeStr(hour),
    end_time: toTimeStr(hour + Math.ceil(durationHours)),
    provider_id: provider.provider.id,
    provider_name: provider.provider.name,
  };
}

/** Try to find a valid primary slot, falling back across multiple days */
async function findPrimarySlot(
  nlu: NLUResult,
  provider: RankedProvider,
  jobDurationHours: number,
  travelBufferMin: number,
): Promise<{ slot: TimeSlot | null; conflict: boolean; existingCount: number }> {
  const preferred_hour = SLOT_HOUR_MAP[nlu.time_preference.preferred_slot || 'morning'];
  const targetDate = resolveTargetDate(nlu);

  // Try the target date first, then +1 and +2 days
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const date = new Date(targetDate.getTime() + dayOffset * 86400000);
    const dateStr = date.toISOString().split('T')[0];
    const existing = await getProviderBookingsForDay(provider.provider.id, dateStr);
    const freeSlots = getFreeSlots(date, provider, existing, jobDurationHours, travelBufferMin);

    if (freeSlots.length === 0) continue;

    // Pick the slot closest to preferred hour
    const best = freeSlots.reduce((closest, s) =>
      Math.abs(s.hour - preferred_hour) < Math.abs(closest.hour - preferred_hour) ? s : closest
    );

    return {
      slot: makeSlot(date, best.hour, provider, jobDurationHours),
      conflict: dayOffset > 0, // Conflict only if we had to shift days
      existingCount: existing.length,
    };
  }

  return { slot: null, conflict: true, existingCount: 0 };
}

// ── Main export ───────────────────────────────────────────────
export async function runSchedulingAgent(
  nlu: NLUResult,
  rankedProviders: RankedProvider[],
  complexity: ComplexityClassification | null,
  userId: string,
): Promise<{ result: SchedulingResult; trace: AgentTrace; assignedProvider: RankedProvider }> {

  const jobDurationHours = complexity
    ? complexity.estimated_duration_minutes / 60
    : 1.5; // Default 90 min

  const start = Date.now();
  let assignedProvider = rankedProviders[0];
  let primarySlot: TimeSlot | null = null;
  let conflictDetected = false;
  let providerIndex = 0;

  // Try providers in rank order until we find a free slot
  while (providerIndex < Math.min(rankedProviders.length, 3)) {
    const candidate = rankedProviders[providerIndex];
    const travelBuffer = candidate.estimated_travel_minutes;

    const { slot, conflict, existingCount } = await findPrimarySlot(nlu, candidate, jobDurationHours, travelBuffer);

    if (slot) {
      primarySlot = slot;
      assignedProvider = candidate;
      conflictDetected = conflict || existingCount > 0;
      console.log(`📅 SchedulingAgent: Slot found with ${candidate.provider.name} at ${slot.start_time} on ${slot.date} (${existingCount} existing jobs)`);
      break;
    }

    console.log(`📅 SchedulingAgent: ${candidate.provider.name} fully booked — trying next`);
    providerIndex++;
  }

  // ── Build alternatives (other times / other days / other providers) ──
  const alternatives: TimeSlot[] = [];
  const targetDate = resolveTargetDate(nlu);

  // Alt 1-2: Different time slots on the same day with the assigned provider
  if (primarySlot) {
    const dateStr = primarySlot.date;
    const existing = await getProviderBookingsForDay(assignedProvider.provider.id, dateStr);
    const freeSlots = getFreeSlots(new Date(dateStr), assignedProvider, existing, jobDurationHours, assignedProvider.estimated_travel_minutes);
    const otherSlots = freeSlots.filter(s => toTimeStr(s.hour) !== primarySlot!.start_time).slice(0, 2);
    for (const s of otherSlots) {
      alternatives.push(makeSlot(new Date(dateStr), s.hour, assignedProvider, jobDurationHours));
    }
  }

  // Alt 3: Next day with assigned provider (if we haven't added 3 alts yet)
  if (alternatives.length < 3 && assignedProvider) {
    const nextDay = new Date(targetDate.getTime() + 86400000);
    const nextDateStr = nextDay.toISOString().split('T')[0];
    const existing = await getProviderBookingsForDay(assignedProvider.provider.id, nextDateStr);
    const freeSlots = getFreeSlots(nextDay, assignedProvider, existing, jobDurationHours, assignedProvider.estimated_travel_minutes);
    if (freeSlots.length > 0) {
      alternatives.push(makeSlot(nextDay, freeSlots[0].hour, assignedProvider, jobDurationHours));
    }
  }

  // Alt: Next best provider for same time (if the primary had a conflict)
  if (conflictDetected && rankedProviders.length > 1) {
    const backup = rankedProviders.find(p => p.provider.id !== assignedProvider.provider.id);
    if (backup && primarySlot) {
      const dateStr = primarySlot.date;
      const existing = await getProviderBookingsForDay(backup.provider.id, dateStr);
      const freeSlots = getFreeSlots(new Date(dateStr), backup, existing, jobDurationHours, backup.estimated_travel_minutes);
      if (freeSlots.length > 0) {
        const best = freeSlots[0];
        alternatives.push({
          ...makeSlot(new Date(dateStr), best.hour, backup, jobDurationHours),
          provider_name: `${backup.provider.name} (backup)`,
        });
      }
    }
  }

  // ── Waitlist if no slot found ─────────────────────────────────
  let waitlistPosition: number | undefined;
  if (!primarySlot) {
    const topProvider = rankedProviders[0];
    const dateStr = targetDate.toISOString().split('T')[0];
    waitlistPosition = await addToWaitlist(
      topProvider.provider.id, userId, nlu.service_type, dateStr
    );
    // Create a provisional slot 2 days out
    primarySlot = {
      date: new Date(targetDate.getTime() + 2 * 86400000).toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '11:30',
      provider_id: topProvider.provider.id,
      provider_name: topProvider.provider.name,
    };
    console.log(`📅 SchedulingAgent: All providers booked — added to waitlist (#${waitlistPosition})`);
  }

  const result: SchedulingResult = {
    primary_slot: primarySlot,
    alternatives: alternatives.slice(0, 3),
    travel_buffer_minutes: assignedProvider.estimated_travel_minutes,
    conflict_detected: conflictDetected,
    waitlist_position: waitlistPosition,
    auto_reschedule_reason: conflictDetected && providerIndex > 0
      ? `Original provider fully booked — auto-assigned ${assignedProvider.provider.name} (rank #${providerIndex + 1})`
      : undefined,
  };

  const elapsed = Date.now() - start;
  const trace: AgentTrace = {
    id: uuid(),
    agent: 'SchedulingAgent',
    step: 'slot_allocation',
    observation: waitlistPosition
      ? `All providers fully booked for ${nlu.service_type} on ${targetDate.toISOString().split('T')[0]} — waitlisted #${waitlistPosition}`
      : `Slot confirmed: ${primarySlot.start_time} on ${primarySlot.date} with ${assignedProvider.provider.name}`,
    reasoning: {
      job_duration_hours: jobDurationHours,
      travel_buffer_minutes: assignedProvider.estimated_travel_minutes,
      providers_tried: providerIndex + 1,
      conflict_detected: conflictDetected,
      alternatives_found: alternatives.length,
      auto_rescheduled: providerIndex > 0,
      waitlisted: !!waitlistPosition,
    },
    decision: waitlistPosition
      ? `User added to waitlist at position #${waitlistPosition}`
      : `Scheduled: ${primarySlot.date} ${primarySlot.start_time}–${primarySlot.end_time} with ${assignedProvider.provider.name}${conflictDetected ? ' (conflict resolved — auto-rescheduled)' : ''}`,
    confidence: waitlistPosition ? 0.4 : conflictDetected ? 0.75 : 0.95,
    action: waitlistPosition ? 'add_to_waitlist' : 'schedule_confirmed',
    timestamp: new Date().toISOString(),
  };

  console.log(`📅 SchedulingAgent done in ${elapsed}ms — ${trace.decision}`);
  return { result, trace, assignedProvider };
}

/**
 * Auto-reschedule when a provider cancels.
 * Returns the next available provider + new slot, or null if no alternatives.
 */
export async function autoRescheduleOnCancel(
  cancelledBooking: Booking,
  rankedProviders: RankedProvider[],
  complexity: ComplexityClassification | null,
): Promise<{ newSlot: TimeSlot; newProvider: RankedProvider; reason: string } | null> {
  // Filter out the cancelled provider
  const alternatives = rankedProviders.filter(p => p.provider.id !== cancelledBooking.provider_id);
  if (alternatives.length === 0) return null;

  const jobDurationHours = complexity ? complexity.estimated_duration_minutes / 60 : 1.5;
  const originalDate = new Date(cancelledBooking.scheduled_time);

  for (const candidate of alternatives.slice(0, 3)) {
    const dateStr = originalDate.toISOString().split('T')[0];
    const existing = await getProviderBookingsForDay(candidate.provider.id, dateStr);
    const freeSlots = getFreeSlots(originalDate, candidate, existing, jobDurationHours, candidate.estimated_travel_minutes);
    if (freeSlots.length > 0) {
      const newSlot = makeSlot(originalDate, freeSlots[0].hour, candidate, jobDurationHours);
      return {
        newSlot,
        newProvider: candidate,
        reason: `${cancelledBooking.provider_name} cancelled — auto-assigned ${candidate.provider.name} at ${newSlot.start_time}`,
      };
    }
  }
  return null;
}
