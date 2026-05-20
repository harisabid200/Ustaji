import { ChatSession, ChatMessage, ChatResponse, ConversationStage, AgentTrace, Booking, BookingStatus, ComplexityClassification } from '../utils/types';
import { runNLUAgent } from './nlu';
import { runMatchingAgent } from './matching';
import { runPricingAgent } from './pricing';
import { classifyJobComplexity } from './complexity';
import { runSchedulingAgent } from './scheduling';
import { callGemini } from '../services/gemini';
import {
  saveSession, fetchSession, setSessionSync, getSessionSync,
  saveBooking, getBookingSync, setBookingSync, getAllBookingsSync
} from '../services/firestore-store';
import { getDB, isFirebaseAvailable } from '../services/firebase-admin';
import { v4 as uuid } from 'uuid';


function getOrCreateSession(sessionId: string | undefined, userId: string): ChatSession {
  const id = sessionId || uuid();
  // Check in-memory first (sync fast path)
  const existing = getSessionSync(id);
  if (existing) return existing;
  // Create new session
  const session: ChatSession = {
    id, user_id: userId, messages: [], current_stage: 'greeting',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  setSessionSync(id, session);
  return session;
}

const RESPONSE_SYSTEM_PROMPT = `You are UstaJi (اُستاجی), a friendly and helpful AI assistant for finding service providers in Pakistan.
You speak naturally in the user's language (Urdu, Roman Urdu, English, or mixed).
Keep responses concise, warm, and conversational — like a helpful friend.
Use the provided context data to inform your response. DO NOT make up data.
If presenting providers, highlight why the top choice is recommended.
Always be respectful and use appropriate Pakistani cultural context.`;

async function generateResponse(session: ChatSession, contextData: Record<string, any>): Promise<string> {
  const recentMessages = session.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
  const prompt = `Conversation so far:\n${recentMessages}\n\nContext data:\n${JSON.stringify(contextData, null, 2)}\n\nGenerate a natural, helpful response. Be concise (2-4 sentences max unless showing providers/pricing).`;

  try {
    return await callGemini(prompt, RESPONSE_SYSTEM_PROMPT);
  } catch {
    // Fallback responses based on stage
    if (contextData.stage === 'understanding') {
      const nlu = contextData.nlu_result;
      return `Main samajh gaya! Aap ko ${nlu?.location?.raw || 'your area'} mein ${nlu?.service_type?.replace('_', ' ')} chahiye. Main best providers dhundh raha hoon... 🔍`;
    }
    if (contextData.stage === 'matching') {
      return `Maine ${contextData.providers?.length || 0} providers dhundhe hain! Yeh raha recommendation... ⭐`;
    }
    return 'Kaise madad kar sakta hoon? Batayein kya service chahiye! 😊';
  }
}

export async function processChatMessage(message: string, sessionId: string | undefined, userId: string, userLocation?: any): Promise<ChatResponse> {
  const session = getOrCreateSession(sessionId, userId);
  if (userLocation) session.user_location = userLocation;
  const traces: AgentTrace[] = [];

  // Add user message
  const userMsg: ChatMessage = {
    id: uuid(), role: 'user', content: message, timestamp: new Date().toISOString(),
  };
  session.messages.push(userMsg);

  let reply = '';
  let stage = session.current_stage;
  let actions: string[] = [];

  // ── Handle action commands ────────────────────────────────
  const lowered = message.toLowerCase().trim();

  if (lowered.includes('confirm') || lowered.includes('book') || lowered === 'yes' || lowered === 'haan' || lowered === '1') {
    if (session.current_stage === 'confirming' && session.selected_provider) {
      // Create booking
      const booking = createBooking(session, userId);
      session.booking = booking;
      session.current_stage = 'booked';
      stage = 'booked';
      // Persist to Firestore + in-memory
      setBookingSync(booking.id, booking);
      saveBooking(booking).catch(() => {});

      const bookTrace: AgentTrace = {
        id: uuid(), agent: 'BookingAgent', step: 'booking_confirmed',
        observation: `User confirmed booking with ${session.selected_provider.provider.name}`,
        reasoning: { provider: session.selected_provider.provider.name, price: booking.price.quoted, time: booking.scheduled_time },
        decision: 'Booking created and confirmed',
        confidence: 1.0, action: 'create_booking', timestamp: new Date().toISOString(),
      };
      traces.push(bookTrace);

      reply = `✅ Booking confirmed!\n\n📋 **Booking #${booking.id.slice(0, 8)}**\n👨‍🔧 ${booking.provider_name}\n📅 ${booking.scheduled_time}\n💰 PKR ${booking.price.quoted}\n📍 ${booking.location.area || booking.location.formatted_address}\n\nAap ko confirmation SMS bhej diya gaya hai (simulated). Provider ko bhi notify kar diya! 📱`;
      actions = ['track_booking', 'cancel_booking'];

      // Add assistant message
      session.messages.push({ id: uuid(), role: 'assistant', content: reply, timestamp: new Date().toISOString(), metadata: { stage, booking, traces } });
      session.updated_at = new Date().toISOString();

      return { reply, session_id: session.id, stage, reasoning_traces: traces, booking, actions, confidence: 1.0 };
    }
  }

  if (lowered.includes('cancel') && session.booking) {
    session.booking.status = 'cancelled';
    reply = '❌ Booking cancel kar diya gaya hai. Koi aur service chahiye?';
    stage = 'greeting';
    session.current_stage = 'greeting';
    actions = ['new_request'];
    session.messages.push({ id: uuid(), role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    return { reply, session_id: session.id, stage, reasoning_traces: [], actions, confidence: 1.0 };
  }

  if (lowered.includes('dispute') && session.booking) {
    stage = 'dispute';
    session.current_stage = 'dispute';
    const dispTrace: AgentTrace = {
      id: uuid(), agent: 'DisputeAgent', step: 'dispute_opened',
      observation: `User raised a dispute for booking ${session.booking.id}`,
      reasoning: { booking_id: session.booking.id, provider: session.booking.provider_name },
      decision: 'Opening dispute investigation', confidence: 0.8, action: 'investigate_dispute', timestamp: new Date().toISOString(),
    };
    traces.push(dispTrace);
    reply = '🔍 Main aap ki complaint investigate kar raha hoon. Kya masla hua? (price dispute, quality issue, no-show, ya koi aur?)';
    actions = ['price_dispute', 'quality_complaint', 'no_show', 'other'];
    session.messages.push({ id: uuid(), role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    return { reply, session_id: session.id, stage, reasoning_traces: traces, actions, confidence: 0.8 };
  }

  // ── Main agentic flow ─────────────────────────────────────

  // Step 1: NLU — Understand the message
  if (stage === 'greeting' || stage === 'understanding' || stage === 'clarifying') {
    const { result: nluResult, trace: nluTrace } = await runNLUAgent(message);
    traces.push(nluTrace);
    session.nlu_context = nluResult;

    if (nluResult.confidence_score < 0.7 || nluResult.clarification_needed.length > 0) {
      stage = 'clarifying';
      session.current_stage = 'clarifying';
      const questions = nluResult.clarification_needed.join('\n• ');
      reply = await generateResponse(session, { stage: 'clarifying', nlu_result: nluResult, questions });
      if (!reply || reply.includes('error')) {
        reply = `Mujhe thori aur information chahiye:\n• ${questions}\n\nPlease batayein taake main best provider dhundh sakoon! 🙏`;
      }
      actions = ['provide_details'];

      session.messages.push({ id: uuid(), role: 'assistant', content: reply, timestamp: new Date().toISOString(), metadata: { stage, nlu_result: nluResult, traces } });
      session.updated_at = new Date().toISOString();
      return { reply, session_id: session.id, stage, nlu_result: nluResult, reasoning_traces: traces, actions, confidence: nluResult.confidence_score };
    }

    // Step 2: Matching
    stage = 'matching';
    const { ranked, trace: matchTrace } = await runMatchingAgent(nluResult, session.user_location?.lat, session.user_location?.lng);
    traces.push(matchTrace);

    if (ranked.length === 0) {
      reply = '😔 Is waqt is area mein koi provider available nahi hai. Kya aap time ya area change karna chahenge?';
      actions = ['change_time', 'expand_area', 'waitlist'];
      session.messages.push({ id: uuid(), role: 'assistant', content: reply, timestamp: new Date().toISOString(), metadata: { stage, traces } });
      return { reply, session_id: session.id, stage, reasoning_traces: traces, actions, confidence: 0.3 };
    }

    // Step 3: Complexity Classification
    const { classification: complexity, trace: complexityTrace } = await classifyJobComplexity(nluResult, ranked[0].provider);
    traces.push(complexityTrace);
    session.complexity = complexity;

    // Step 4: Pricing (now receives complexity from agent)
    const { result: pricingResult, trace: priceTrace } = runPricingAgent(nluResult, ranked, complexity);
    traces.push(priceTrace);

    // Step 5: Scheduling — find slot, detect conflicts, generate alternatives
    const { result: schedulingResult, trace: schedTrace, assignedProvider } = await runSchedulingAgent(
      nluResult, ranked, complexity, userId
    );
    traces.push(schedTrace);
    session.scheduling_result = schedulingResult;

    // Use the scheduling-assigned provider (may differ from rank[0] if rank[0] was booked)
    const finalProvider = assignedProvider;
    session.selected_provider = finalProvider;
    session.pricing_result = pricingResult;
    session.current_stage = 'confirming';
    stage = 'confirming';

    const slot = schedulingResult.primary_slot;
    const contextData = {
      stage: 'confirming',
      nlu_result: nluResult,
      job_complexity: {
        level: complexity.level,
        reasoning: complexity.reasoning,
        duration_min: complexity.estimated_duration_minutes,
        matched_skills: complexity.matched_skills,
        required_tools: complexity.required_tools,
        provider_suitable: complexity.provider_suitable,
        upsell: complexity.upsell_opportunity,
      },
      schedule: {
        date: slot.date,
        time: slot.start_time,
        end_time: slot.end_time,
        conflict_resolved: schedulingResult.conflict_detected,
        auto_rescheduled: schedulingResult.auto_reschedule_reason,
        waitlisted: schedulingResult.waitlist_position,
        alternatives: schedulingResult.alternatives.map(a => `${a.date} ${a.start_time} with ${a.provider_name}`),
      },
      top_provider: { name: finalProvider.provider.name, score: finalProvider.total_score, rating: finalProvider.provider.stats.avg_rating, distance_km: finalProvider.estimated_distance_km, risks: finalProvider.risk_flags, rationale: finalProvider.gemini_rationale },
      pricing: { total: pricingResult.primary_quote.total, breakdown: pricingResult.primary_quote, budget_alt: pricingResult.budget_alternative, provider_earnings: pricingResult.provider_earnings, demand_level: pricingResult.demand_level },
      budget: {
        max_budget: nluResult.constraints.max_budget || null,
        over_budget: (pricingResult as any).over_budget || false,
        quoted_total: pricingResult.primary_quote.total,
        budget_alt_total: pricingResult.budget_alternative?.total || null,
        budget_alt_name: pricingResult.budget_alternative?.provider_name || null,
      },
      alternatives: ranked.slice(1, 3).map(r => ({ name: r.provider.name, score: r.total_score, rating: r.provider.stats.avg_rating })),
    };

    reply = await generateResponse(session, contextData);
    if (!reply || reply.includes('error')) {
      const p = ranked[0].provider;
      const price = pricingResult.primary_quote;
      const overBudget = (pricingResult as any).over_budget;
      const userBudget = nluResult.constraints.max_budget;

      let budgetWarning = '';
      if (overBudget && userBudget) {
        budgetWarning = `\n\n⚠️ **Budget Alert:** Aap ka budget PKR ${userBudget.toLocaleString()} tha, lekin best provider ki quote PKR ${price.total.toLocaleString()} hai.`;
        if (pricingResult.budget_alternative) {
          budgetWarning += `\n💡 Budget option: **${pricingResult.budget_alternative.provider_name}** @ PKR ${pricingResult.budget_alternative.total.toLocaleString()} — budget ke andar!`;
        }
      }

      reply = `🔍 Maine ${ranked.length} providers check kiye. Yeh raha best match:\n\n⭐ **${p.name}** (${p.stats.avg_rating}★)\n📍 ${ranked[0].estimated_distance_km}km door\n⏱️ ${p.stats.on_time_percentage}% on-time\n💰 PKR ${price.total}\n\n📊 Price breakdown:\n• Base: PKR ${price.base_rate}\n• Distance: PKR ${price.distance_cost}\n• Total: PKR ${price.total}${budgetWarning}\n${pricingResult.budget_alternative && !overBudget ? `\n💡 Budget option: ${pricingResult.budget_alternative.provider_name} @ PKR ${pricingResult.budget_alternative.total}` : ''}\n\nBook karein? (Yes/Haan to confirm)`;
    }

    actions = ['confirm_booking', 'change_provider', 'change_time', 'see_more_providers'];
    if (schedulingResult.alternatives.length > 0) actions.push('see_other_slots');

    const assistantMsg: ChatMessage = {
      id: uuid(), role: 'assistant', content: reply, timestamp: new Date().toISOString(),
      metadata: { stage, nlu_result: nluResult, providers: ranked.slice(0, 3), pricing: pricingResult, traces, actions, confidence: ranked[0].total_score / 100 },
    };
    session.messages.push(assistantMsg);
    session.updated_at = new Date().toISOString();
    // Persist session to Firestore (non-blocking)
    saveSession(session).catch(() => {});

    return {
      reply, session_id: session.id, stage, nlu_result: nluResult,
      reasoning_traces: traces, providers: ranked.slice(0, 5),
      price_estimate: pricingResult, scheduling: schedulingResult,
      actions, confidence: finalProvider.total_score / 100,
    };
  }

  // Default: generate a conversational response
  reply = await generateResponse(session, { stage, message });
  if (!reply) reply = 'Kaise madad kar sakta hoon? Service ki zaroorat ho to batayein! 😊';
  session.messages.push({ id: uuid(), role: 'assistant', content: reply, timestamp: new Date().toISOString() });

  return { reply, session_id: session.id, stage, reasoning_traces: traces, actions: ['new_request'], confidence: 0.5 };
}

function createBooking(session: ChatSession, userId: string): Booking {
  const provider = session.selected_provider!;
  const nlu = session.nlu_context!;
  const pricing = session.pricing_result!;

  // Use the scheduling agent's confirmed slot (or fall back if somehow missing)
  const slot = session.scheduling_result?.primary_slot;
  const scheduledTime = slot
    ? `${slot.date} ${slot.start_time}`
    : (() => {
        const tomorrow = new Date(Date.now() + 86400000);
        const timeMap: Record<string, string> = { morning: '10:00', afternoon: '14:00', evening: '17:00', night: '20:00' };
        return `${tomorrow.toISOString().split('T')[0]} ${timeMap[nlu.time_preference.preferred_slot || 'morning']}`;
      })();

  return {
    id: uuid(),
    user_id: userId,
    provider_id: provider.provider.id,
    provider_name: provider.provider.name,
    service_type: nlu.service_type,
    service_subtype: nlu.service_subtype,
    job_complexity: session.complexity?.level || 'intermediate',
    status: 'confirmed' as BookingStatus,
    scheduled_time: scheduledTime,
    location: nlu.location.resolved || { lat: 33.6651, lng: 72.9648, area: nlu.location.raw, city: 'Islamabad' },
    price: { quoted: pricing.primary_quote.total, breakdown: pricing.primary_quote, currency: 'PKR' },
    reasoning_traces: [],
    notifications: [
      { id: uuid(), type: 'sms',      recipient: 'user',                 message: `UstaJi: ✅ ${nlu.service_type.replace(/_/g, ' ')} booking confirmed with ${provider.provider.name} on ${scheduledTime}. PKR ${pricing.primary_quote.total}`, status: 'sent', timestamp: new Date().toISOString() },
      { id: uuid(), type: 'whatsapp', recipient: provider.provider.phone, message: `📋 New job: ${nlu.service_type} at ${nlu.location.raw} on ${scheduledTime}. Client location: ${nlu.location.resolved?.formatted_address || nlu.location.raw}`, status: 'sent', timestamp: new Date().toISOString() },
      { id: uuid(), type: 'push',     recipient: 'user',                 message: `Booking confirmed! ${provider.provider.name} will arrive at ${slot?.start_time || '10:00'}`, status: 'sent', timestamp: new Date().toISOString() },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Export for routes
export function getBooking(id: string): Booking | undefined { return getBookingSync(id); }
export function getAllBookings(userId: string): Booking[] { return getAllBookingsSync(userId); }
export function getSession(id: string): ChatSession | undefined { return getSessionSync(id); }

export function updateBookingStatus(id: string, status: string): boolean {
  const booking = getBookingSync(id);
  if (!booking) return false;
  (booking as any).status = status;
  booking.updated_at = new Date().toISOString();
  setBookingSync(id, booking);
  // Persist to Firestore (non-blocking)
  saveBooking(booking).catch(() => {});
  return true;
}

/**
 * Provider reports they are running late on the current job.
 */
export function reportDelay(
  currentBookingId: string,
  delayMinutes: number,
  reason: string
): { currentBookingId: string; nextBookingId: string | null; newScheduledTime: string | null } {

  const current = getBookingSync(currentBookingId);
  if (!current) throw new Error('Booking not found');

  const now = new Date().toISOString();
  const originalTime = current.scheduled_time;

  (current as any).delay = {
    delay_minutes: delayMinutes,
    reason,
    reported_at: now,
    original_scheduled_time: originalTime,
    new_scheduled_time: originalTime,
    user_notified: false,
  };
  current.updated_at = now;
  setBookingSync(currentBookingId, current);
  saveBooking(current).catch(() => {});

  // Find this provider's next upcoming booking (in-memory scan)
  const providerBookings = getAllBookingsSync('*')
    .filter((b: Booking) =>
      b.provider_id === current.provider_id &&
      b.id !== currentBookingId &&
      ['confirmed', 'pending'].includes(b.status)
    )
    .sort((a: Booking, b: Booking) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  if (providerBookings.length === 0) {
    return { currentBookingId, nextBookingId: null, newScheduledTime: null };
  }

  const nextBooking = providerBookings[0] as Booking;
  const originalNextTime = new Date(nextBooking.scheduled_time);
  const newNextTime = new Date(originalNextTime.getTime() + delayMinutes * 60 * 1000);
  const newNextTimeISO = newNextTime.toISOString().replace('T', ' ').substring(0, 16);

  const previousTime = nextBooking.scheduled_time;
  nextBooking.scheduled_time = newNextTimeISO;
  nextBooking.updated_at = now;
  (nextBooking as any).status = 'delayed';
  (nextBooking as any).delay = {
    delay_minutes: delayMinutes,
    reason,
    reported_at: now,
    original_scheduled_time: previousTime,
    new_scheduled_time: newNextTimeISO,
    user_notified: true,
  };

  nextBooking.notifications = nextBooking.notifications || [];
  nextBooking.notifications.push({
    id: uuid(),
    type: 'push',
    recipient: nextBooking.user_id,
    message: `⚠️ Update: ${current.provider_name} is running ${delayMinutes} minutes late. Your appointment has been moved to ${newNextTimeISO}. Reason: ${reason}`,
    status: 'sent',
    timestamp: now,
  });

  setBookingSync(nextBooking.id, nextBooking);
  saveBooking(nextBooking).catch(() => {});

  return {
    currentBookingId,
    nextBookingId: nextBooking.id,
    newScheduledTime: newNextTimeISO,
  };
}

export async function addRating(bookingId: string, ratingData: { rating: number; review: string; category_ratings?: Record<string, number> }): Promise<void> {
  const booking = getBookingSync(bookingId);
  if (!booking) throw new Error('Booking not found');

  (booking as any).feedback = {
    rating: ratingData.rating,
    review: ratingData.review,
    category_ratings: ratingData.category_ratings,
    submitted_at: new Date().toISOString(),
  };
  (booking as any).status = 'rated';
  booking.updated_at = new Date().toISOString();
  setBookingSync(bookingId, booking);
  saveBooking(booking).catch(() => {});

  const providerId = booking.provider_id;
  const newReview = {
    id: `rev-${Date.now()}`,
    user_name: 'User',
    rating: ratingData.rating,
    text: ratingData.review || '',
    created_at: new Date().toISOString().split('T')[0],
  };

  // ── Persist to Firestore ──────────────────────────────────────
  if (isFirebaseAvailable()) {
    try {
      const db = getDB();
      const providerRef = db.collection('providers').doc(providerId);
      await db.runTransaction(async (txn) => {
        const doc = await txn.get(providerRef);
        if (!doc.exists) return; // provider not in Firestore, skip
        const data = doc.data()!;
        const stats = data.stats || {};
        const prevTotal = (stats.avg_rating || 5) * (stats.rating_count || 0);
        const newCount = (stats.rating_count || 0) + 1;
        const newAvg = parseFloat(((prevTotal + ratingData.rating) / newCount).toFixed(2));
        const reviews = Array.isArray(data.reviews) ? [newReview, ...data.reviews.slice(0, 49)] : [newReview];
        txn.update(providerRef, {
          'stats.avg_rating': newAvg,
          'stats.rating_count': newCount,
          reviews,
          updated_at: new Date().toISOString(),
        });
      });
      console.log(`✅ Rating for provider ${providerId} saved to Firestore`);
    } catch (e: any) {
      console.error(`⚠️  Firestore rating update failed for ${providerId}:`, e.message);
    }
  }

  // ── Update in-memory mock as well (keeps local dev consistent) ─
  const { mockProviders } = require('../data/providers');
  const provider = mockProviders.find((p: any) => p.id === providerId);
  if (provider) {
    const prev = provider.stats.avg_rating * provider.stats.rating_count;
    provider.stats.rating_count++;
    provider.stats.avg_rating = parseFloat(((prev + ratingData.rating) / provider.stats.rating_count).toFixed(2));
    provider.reviews = provider.reviews || [];
    provider.reviews.unshift(newReview);
  }
}



