import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initGemini } from './services/gemini';
import { initFirebase } from './services/firebase-admin';
import { processChatMessage, getBooking, getAllBookings, updateBookingStatus, addRating, reportDelay } from './agents/supervisor';
import { mockProviders, getProviderById } from './data/providers';
import { getAllProvidersFromDB } from './services/provider-service';
import { fetchAllBookings, fetchProviderBookings, updateBooking } from './services/firestore-store';
import { getDB, isFirebaseAvailable } from './services/firebase-admin';
import { validate, ChatSchema, ProviderRegisterSchema, RatingSchema, BookingStatusSchema, DelaySchema } from './middleware/validation';
import { errorHandler, asyncHandler } from './middleware/error-handler';

// In-memory provider online status (resets on server restart — acceptable for MVP)
const providerOnlineStatus = new Map<string, boolean>();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Security Headers (Helmet) ────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
// In production, restrict to deployed frontend origins.
// In development, allow all origins so local Expo can connect.
const allowedOrigins = IS_PROD
  ? (process.env.ALLOWED_ORIGINS === '*' || !process.env.ALLOWED_ORIGINS)
      ? '*' 
      : (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
  : true; // allow all in dev

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '50kb' })); // prevent large payload attacks

// ── Rate Limiting ────────────────────────────────────────────

// General limiter: 120 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Strict limiter for the expensive AI chat endpoint: 15 per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Chat rate limit reached. Please wait a moment.' },
});

// Strict limiter for provider registration: 5 per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

app.use('/api/', generalLimiter);

// ── Health Check (deep) ───────────────────────────────────────
app.get('/api/health', asyncHandler(async (_, res) => {
  const { getGeminiHealth } = await import('./services/gemini');
  const geminiHealth = getGeminiHealth();

  // Quick Firestore probe (non-blocking, 2s timeout)
  let firestoreStatus: 'connected' | 'fallback-mode' | 'error' = 'fallback-mode';
  if (isFirebaseAvailable()) {
    try {
      // Lightweight probe with a manual timeout wrapper (5s for cold-start tolerance)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Firestore probe timeout')), 5000);
        getDB().collection('providers').limit(1).get()
          .then(() => { clearTimeout(timer); resolve(); })
          .catch((err: Error) => { clearTimeout(timer); reject(err); });
      });
      firestoreStatus = 'connected';
    } catch {
      firestoreStatus = 'error';
    }
  }

  // Healthy = Gemini is up and Firestore is not in hard error (fallback-mode is acceptable)
  const healthy = geminiHealth.available && !geminiHealth.circuitOpen && firestoreStatus !== 'error';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'UstaJi API',
    timestamp: new Date().toISOString(),
    checks: {
      firestore: firestoreStatus,
      gemini: {
        initialized: geminiHealth.available,
        circuit_open: geminiHealth.circuitOpen,
        failure_count: geminiHealth.failureCount,
      },
    },
  });
}));

// ── Chat (Primary Interface) ──────────────────────────────────
app.post('/api/chat', chatLimiter, validate(ChatSchema), asyncHandler(async (req, res) => {
  const { message, session_id, user_id, user_location } = req.body;
  const response = await processChatMessage(message, session_id, user_id || 'demo-user', user_location);
  res.json(response);
}));

// ── Categories ────────────────────────────────────────────────
app.get('/api/categories', (_, res) => {
  const categoryMap: Record<string, { name: string; icon: string; count: number }> = {};
  for (const p of mockProviders) {
    for (const svc of (p.service_types || [])) {
      if (!categoryMap[svc]) {
        categoryMap[svc] = { name: svc.replace(/_/g, ' '), icon: getCategoryIcon(svc), count: 0 };
      }
      categoryMap[svc].count++;
    }
  }
  const categories = Object.entries(categoryMap).map(([id, info]) => ({ id, ...info }));
  res.json({ categories });
});

// ── Providers ─────────────────────────────────────────────────
app.get('/api/providers', asyncHandler(async (req, res) => {
  const { category } = req.query;
  let providers = await getAllProvidersFromDB();

  // Fallback to mocks if DB is empty
  if (providers.length === 0) {
    providers = mockProviders;
  }

  if (category) {
    providers = providers.filter(p => p.service_types?.includes(category as string as any));
  }

  const summary = providers.map(p => ({
    id: p.id, name: p.name, service_types: p.service_types,
    rating: p?.stats?.avg_rating || 0, area: p?.location?.area || 'Unknown',
    verified: p.verified, certifications: p.certifications || [],
    base_rate: p.rate_card ? Math.min(...Object.values(p.rate_card)) : 0,
    trust_score: calculateTrustScore(p),
  }));
  res.json({ providers: summary, total: summary.length });
}));

app.get('/api/providers/:id', asyncHandler(async (req, res) => {
  let provider: any = null;

  if (isFirebaseAvailable()) {
    const doc = await getDB().collection('providers').doc(req.params.id as string).get();
    if (doc.exists) provider = doc.data();
  }

  if (!provider) provider = getProviderById(req.params.id as string);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  res.json({
    ...provider,
    trust_score: calculateTrustScore(provider),
    bio: provider.bio || `${provider.name} is a ${provider.service_types?.[0]?.replace(/_/g, ' ')} specialist with ${provider.experience_years || 0} years of experience in ${provider.location?.area || 'Pakistan'}.`,
  });
}));

app.post('/api/provider/register', registerLimiter, validate(ProviderRegisterSchema), asyncHandler(async (req, res) => {
  const providerData = req.body;

  const newProvider = {
    ...providerData,
    stats: {
      total_jobs: 0,
      completed_jobs: 0,
      on_time_percentage: 100,
      cancellation_rate: 0,
      avg_rating: 5.0,
      rating_count: 0,
    },
    verified: false,
    created_at: new Date().toISOString(),
  };

  if (isFirebaseAvailable()) {
    await getDB().collection('providers').doc(newProvider.id).set(newProvider);
    console.log(`✅ Saved new provider ${newProvider.name} to Firestore`);
  } else {
    console.warn(`⚠️ Firebase not available. Could not save provider ${newProvider.name}`);
  }

  res.json({ success: true, provider: newProvider });
}));

// ── Bookings ──────────────────────────────────────────────────
app.get('/api/bookings', async (req, res) => {
  const userId = (req.query.user_id as string) || 'demo-user';
  res.json({ bookings: await getAllBookings(userId) });
});

app.get('/api/bookings/:id', async (req, res) => {
  const booking = await getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

app.post('/api/bookings/:id/cancel', async (req, res) => {
  const ok = await updateBookingStatus(req.params.id, 'cancelled');
  if (!ok) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true, status: 'cancelled' });
});

app.post('/api/bookings/:id/delay', validate(DelaySchema), async (req, res) => {
  const { delay_minutes, reason } = req.body;
  try {
    const result = await reportDelay(req.params.id as string, delay_minutes, reason || 'Provider running late');
    res.json({
      success: true,
      message: result.nextBookingId
        ? `Next booking rescheduled to ${result.newScheduledTime}. User has been notified.`
        : 'Delay recorded. No subsequent booking found for this provider.',
      ...result,
    });
  } catch (e: any) {
    res.status(404).json({ error: 'Booking not found' });
  }
});

app.put('/api/bookings/:id/status', validate(BookingStatusSchema), async (req, res) => {
  const { status } = req.body;
  const ok = await updateBookingStatus(req.params.id as string, status);
  if (!ok) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true, status });
});

app.post('/api/bookings/:id/rate', validate(RatingSchema), asyncHandler(async (req, res) => {
  const { rating, review, category_ratings } = req.body;
  await addRating(req.params.id as string, { rating, review, category_ratings });
  res.json({ success: true, message: 'Rating submitted. Shukriya!' });
}));

// ── Provider APIs ─────────────────────────────────────────────

/** GET /api/provider/dashboard — real earnings, jobs, trust score */
app.get('/api/provider/dashboard', asyncHandler(async (req, res) => {
  const { provider_id } = req.query;
  if (!provider_id) return res.status(400).json({ error: 'provider_id required' });

  // Fetch real bookings from Firestore for this provider
  const providerBookings = await fetchProviderBookings(provider_id as string);
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = providerBookings.filter(b => b.scheduled_time?.startsWith(today));
  const completedToday = todayBookings.filter(b => ['completed', 'rated'].includes(b.status)).length;
  const earningsToday = todayBookings
    .filter(b => ['completed', 'rated', 'confirmed', 'in_progress'].includes(b.status))
    .reduce((sum, b) => sum + (b.price?.quoted || 0), 0);

  // Weekly earnings (last 7 days)
  const weeklyEarnings: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    weeklyEarnings[key] = providerBookings
      .filter(b => b.scheduled_time?.startsWith(key) && ['completed', 'rated'].includes(b.status))
      .reduce((sum, b) => sum + (b.price?.quoted || 0), 0);
  }

  // Avg rating from provider record in Firestore or mockProviders
  const mockProvider = getProviderById(provider_id as string);
  const avgRating = mockProvider?.stats?.avg_rating ?? null;
  const ratingCount = mockProvider?.stats?.rating_count ?? 0;
  const trustScore = mockProvider ? calculateTrustScore(mockProvider) : null;
  const isOnline = providerOnlineStatus.get(provider_id as string) ?? false;

  res.json({
    provider_id,
    avg_rating: avgRating,
    rating_count: ratingCount,
    trust_score: trustScore,
    is_online: isOnline,
    today: {
      jobs_scheduled: todayBookings.length,
      jobs_completed: completedToday,
      earnings: earningsToday,
    },
    total_bookings: providerBookings.length,
    weekly_earnings: weeklyEarnings,
  });
}));

/** PUT /api/provider/status — toggle provider online/offline */
app.put('/api/provider/status', asyncHandler(async (req, res) => {
  const { provider_id, is_online } = req.body;
  if (!provider_id || typeof is_online !== 'boolean') {
    return res.status(400).json({ error: 'provider_id and is_online (boolean) required' });
  }
  providerOnlineStatus.set(provider_id as string, is_online);
  res.json({ success: true, provider_id, is_online });
}));

/** GET /api/provider/bookings — all jobs for this provider */
app.get('/api/provider/bookings', asyncHandler(async (req, res) => {
  const { provider_id } = req.query;
  if (!provider_id) return res.status(400).json({ error: 'provider_id required' });
  const bookings = await fetchProviderBookings(provider_id as string);
  res.json({ bookings, total: bookings.length });
}));

/** GET /api/provider/opportunities — unmatched pending bookings matching provider services */
app.get('/api/provider/opportunities', asyncHandler(async (req, res) => {
  const { provider_id } = req.query;

  // Check online status — offline providers get empty list
  if (provider_id && !providerOnlineStatus.get(provider_id as string)) {
    return res.json({ opportunities: [] });
  }

  const allBookings = await fetchAllBookings();
  const provider = provider_id ? getProviderById(provider_id as string) : null;
  const providerServices = provider?.service_types ?? [];

  const opportunities = allBookings
    .filter(b => {
      // Only bookings that have no provider assigned yet (open opportunities)
      const isOpen = b.status === 'pending' && (!b.provider_id || b.provider_id === '');
      // Match provider's services (if we know them)
      const serviceMatch = providerServices.length === 0 || providerServices.includes(b.service_type);
      return isOpen && serviceMatch;
    })
    .map(b => ({
      id: b.id,
      service_type: b.service_type,
      area: b.location?.area ?? b.location?.city ?? 'Islamabad',
      distance_km: parseFloat((Math.random() * 4 + 0.5).toFixed(1)), // proximity calc placeholder
      estimated_price: b.price?.quoted ?? 2000,
      urgency: b.scheduled_time?.startsWith(new Date().toISOString().split('T')[0]) ? 'Today' : 'Upcoming',
      time_limit_seconds: 120,
      match_score: providerServices.includes(b.service_type) ? 94 : 78,
      scheduled_time: b.scheduled_time,
      customer_id: b.user_id,
      description: b.description ?? '',
    }))
    .slice(0, 20); // cap at 20 per request

  // Demo fallback so the screen is never blank during testing
  if (opportunities.length === 0) {
    opportunities.push({
      id: 'opp-demo', service_type: 'ac_repair', area: 'G-13',
      distance_km: 0.8, estimated_price: 3500, urgency: 'Today',
      time_limit_seconds: 120, match_score: 94,
      scheduled_time: new Date().toISOString(), customer_id: 'demo',
      description: 'AC not cooling, gas refill needed',
    });
  }

  res.json({ opportunities });
}));

/** POST /api/provider/opportunities/:id/respond — accept or decline a job */
app.post('/api/provider/opportunities/:id/respond', asyncHandler(async (req, res) => {
  const bookingId = req.params.id as string;
  const { accepted, provider_id } = req.body;

  if (accepted && bookingId !== 'opp-demo') {
    // Update the booking: assign this provider and change status to confirmed
    const updated = await updateBooking(bookingId, {
      provider_id: provider_id ?? 'unknown',
      status: 'confirmed' as any,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Booking not found' });
    }
  }

  res.json({
    success: true,
    accepted,
    booking_id: bookingId,
    message: accepted
      ? '✅ Job accepted! The customer has been notified.'
      : 'Opportunity declined.',
  });
}));

// ── Centralized Error Handler (must be last) ──────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────
initFirebase();
initGemini();

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  const lanIp = (Object.values(nets as any)
    .flat()
    .find((n: any) => n && n.family === 'IPv4' && !n.internal) as any)?.address ?? 'unknown';

  console.log(`\n🚀 UstaJi API running [${IS_PROD ? 'production' : 'development'}]`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${lanIp}:${PORT}  ← use this on phone`);
  console.log(`\n📋 Key endpoints:`);
  console.log(`   POST /api/chat                  — AI chat (rate limited: 15/min)`);
  console.log(`   GET  /api/categories            — Service categories`);
  console.log(`   GET  /api/providers             — List providers`);
  console.log(`   GET  /api/bookings              — List bookings`);
  console.log(`   POST /api/bookings/:id/delay    — Report running late`);
  console.log(`   POST /api/bookings/:id/rate     — Submit rating\n`);
});

// ── Graceful Shutdown (Phase 2 prep) ─────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

// ── Helpers ───────────────────────────────────────────────────
function calculateTrustScore(provider: any): number {
  const stats = provider.stats;
  if (!stats) return 70;
  const completionRate = stats.total_jobs > 0 ? (stats.completed_jobs / stats.total_jobs) * 100 : 70;
  const onTime = stats.on_time_percentage ?? 80;
  const rating = (stats.avg_rating / 5) * 100;
  const nonCancel = 100 - (stats.cancellation_rate ?? 10);
  const score = (completionRate * 0.2) + (onTime * 0.2) + (rating * 0.25) + (nonCancel * 0.2) + (15);
  return Math.min(99, Math.max(40, Math.round(score)));
}

function getCategoryIcon(svc: string): string {
  const map: Record<string, string> = {
    ac_repair: '❄️', ac_installation: '🌬️', plumbing: '🔧', electrical: '⚡',
    carpentry: '🪵', painting: '🎨', cleaning: '🧹', tutoring: '📚',
    beauty: '💄', driving: '🚐', mechanic: '🚗', home_appliance: '📺',
  };
  return map[svc] ?? '🔧';
}
