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
import { getDB, isFirebaseAvailable } from './services/firebase-admin';
import { validate, ChatSchema, ProviderRegisterSchema, RatingSchema, BookingStatusSchema, DelaySchema } from './middleware/validation';
import { errorHandler, asyncHandler } from './middleware/error-handler';

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

app.post('/api/bookings/:id/cancel', (req, res) => {
  const ok = updateBookingStatus(req.params.id, 'cancelled');
  if (!ok) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true, status: 'cancelled' });
});

app.post('/api/bookings/:id/delay', validate(DelaySchema), (req, res) => {
  const { delay_minutes, reason } = req.body;
  try {
    const result = reportDelay(req.params.id as string, delay_minutes, reason || 'Provider running late');
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

app.put('/api/bookings/:id/status', validate(BookingStatusSchema), (req, res) => {
  const { status } = req.body;
  const ok = updateBookingStatus(req.params.id as string, status);
  if (!ok) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true, status });
});

app.post('/api/bookings/:id/rate', validate(RatingSchema), asyncHandler(async (req, res) => {
  const { rating, review, category_ratings } = req.body;
  await addRating(req.params.id as string, { rating, review, category_ratings });
  res.json({ success: true, message: 'Rating submitted. Shukriya!' });
}));

// ── Provider APIs ─────────────────────────────────────────────
app.get('/api/provider/dashboard', asyncHandler(async (req, res) => {
  const { provider_id } = req.query;
  const provider = provider_id ? getProviderById(provider_id as string) : mockProviders[0];
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  res.json({
    provider_id: provider.id,
    name: provider.name,
    trust_score: calculateTrustScore(provider),
    today: { jobs_scheduled: 2, jobs_completed: 1, earnings: 3500 },
    stats: provider.stats,
    is_online: true,
  });
}));

app.get('/api/provider/opportunities', (_, res) => {
  res.json({
    opportunities: [{
      id: 'opp-1', service_type: 'ac_repair', area: 'G-13',
      distance_km: 0.8, estimated_price: 3500, urgency: 'Today',
      time_limit_seconds: 120, match_score: 94,
    }],
  });
});

app.post('/api/provider/opportunities/:id/respond', (req, res) => {
  const { accepted } = req.body;
  res.json({ success: true, accepted, message: accepted ? 'Job accepted! User notified.' : 'Opportunity declined.' });
});

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
