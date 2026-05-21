# UstaJi — Agentic Service Economy Platform

> **UstaJi** (Urdu: *Master/Expert*) is an AI-powered marketplace that connects Pakistani households with verified local service providers — plumbers, electricians, AC technicians, and more — through a conversational agentic interface.

Built end-to-end for a hackathon, UstaJi replaces the chaotic informal phone/referral system for home services in Pakistan with a WhatsApp-style chat flow where an AI pipeline handles everything: understanding the request in English, Urdu, or Roman Urdu → finding the best provider → quoting a fair price → scheduling → and managing the job lifecycle through to rating.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Architecture Overview](#architecture-overview)
3. [AI Agents](#ai-agents)
4. [Tech Stack](#tech-stack)
5. [APIs — Mock vs Real](#apis--mock-vs-real)
6. [Integrations](#integrations)
7. [Project Structure](#project-structure)
8. [Getting Started — Local Development](#getting-started--local-development)
9. [Environment Variables](#environment-variables)
10. [API Reference](#api-reference)
11. [Deployment](#deployment)
12. [Resilience & Production Hardening](#resilience--production-hardening)

---

## Key Features

**For Customers (Users)**
- 💬 Natural language chat in English, Urdu, or Roman Urdu to request any home service
- 🤖 AI-driven provider matching with transparent scoring and reasoning traces
- 💰 Dynamic pricing based on job complexity, urgency, and market demand
- 📅 Smart scheduling with conflict detection and automatic waitlist management
- 📍 Proximity-aware matching using real geo-distance calculations
- ⭐ Post-job rating system with Firestore persistence
- 🔔 Real-time booking status tracking (Confirmed → En Route → In Progress → Done)

**For Service Providers**
- 🧑‍🔧 4-step onboarding wizard (services, location, rates, availability)
- 📲 Live opportunity feed — accept or decline jobs with a 2-minute response window
- ⏰ "Running Late" delay reporting that auto-notifies the next client
- 📅 Real schedule view from actual Firestore bookings
- 💰 Real earnings dashboard with 7-day bar chart from live booking data
- 🟢 Online/Offline toggle that controls opportunity delivery from the server

---

## Architecture Overview

UstaJi follows a **monorepo structure** with two independently deployable components:

```
Hackathon/
├── server/        ← Node.js/Express API + AI Agent pipeline
└── mobile/        ← React Native (Expo) iOS/Android app
```

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Mobile App (Expo)                        │
│  Customer Flow            │          Provider Flow               │
│  HomeScreen               │          ProviderDashboardScreen      │
│  ChatScreen ──────────────┤          OpportunityScreen            │
│  BookingsScreen           │          ProviderScheduleScreen       │
│  RatingScreen             │          ProviderEarningsScreen       │
└───────────────┬───────────┴──────────────────┬──────────────────┘
                │  REST API (fetchWithTimeout)   │
                ▼                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Express API Server (Node.js)                    │
│                                                                   │
│  POST /api/chat ────────► Supervisor Agent                        │
│                                │                                  │
│                    ┌───────────┼───────────────┐                  │
│                    ▼           ▼               ▼                  │
│               NLU Agent   Matching Agent   Pricing Agent          │
│                    │       (Gemini AI)          │                  │
│                    └──────► Scheduling Agent ◄──┘                 │
│                                 │                                  │
│                                 ▼                                  │
│                        Complexity Agent                            │
│                                                                   │
│  GET  /api/providers ──────────────────────────────────────────── │
│  GET  /api/categories                                             │
│  GET  /api/bookings                                               │
│  POST /api/bookings/:id/rate ───────────────────────────────────  │
│  PUT  /api/bookings/:id/status                                    │
│  POST /api/bookings/:id/delay                                     │
│  GET  /api/provider/opportunities                                  │
│  POST /api/provider/opportunities/:id/respond                     │
│  PUT  /api/provider/status                                        │
│  GET  /api/provider/bookings                                      │
│  GET  /api/provider/dashboard                                     │
│  GET  /api/health ──────────────────── Deep health check          │
└─────────────────────────┬─────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
     Firestore DB     Gemini API    In-Memory
    (sessions,      (Flash 2.5)    Provider Store
     bookings,      (AI backbone)   (mockProviders
     providers,                     fallback)
     ratings)
```

### Request Lifecycle (Chat)

1. User sends a message → `POST /api/chat`
2. **Supervisor Agent** orchestrates the pipeline based on conversation stage
3. **NLU Agent** parses intent, service type, location, urgency, budget from natural language
4. **Matching Agent** ranks providers using 11 weighted factors + Gemini reasoning
5. **Complexity Agent** classifies job difficulty (basic/intermediate/complex)
6. **Pricing Agent** calculates dynamic quote with breakdown
7. **Scheduling Agent** checks provider calendar, detects conflicts, proposes time slots
8. Response returns with AI message + structured metadata (providers, price, schedule, traces)
9. On booking confirmation → Supervisor creates a `Booking` and persists to Firestore

---

## AI Agents

UstaJi implements a **multi-agent architecture** where each agent is a focused TypeScript class with a single responsibility. All Gemini calls go through a shared resilient wrapper (retry + circuit breaker).

### 1. NLU Agent — `server/src/agents/nlu.ts`

Responsible for understanding what the user wants from free-form text in any language.

| Input | Output |
|-------|--------|
| Raw user message (any language) | Structured `NLUResult` |

**What it does:**
- Detects service type (`ac_repair`, `plumbing`, `electrical`, etc.)
- Extracts location (area/city in Pakistan)
- Determines urgency (`emergency`, `today`, `tomorrow`, `this_week`, `flexible`)
- Classifies budget sensitivity and issue severity
- Detects language (`en`, `ur`, `roman_ur`, `mixed`)
- Identifies what clarification is needed before matching

**Model used:** Gemini 2.5 Flash with structured JSON output schema

### 2. Matching Agent — `server/src/agents/matching.ts`

Ranks all available providers against a service request using 11 scoring factors.

| Factor | Weight |
|--------|--------|
| Distance / Travel Time | 20% |
| Rating (time-weighted) | 18% |
| On-Time Reliability | 15% |
| Availability Match | 12% |
| Skill Specialization | 10% |
| Price Competitiveness | 8% |
| Review Recency | 7% |
| Capacity (slots today) | 5% |
| Cancellation Rate | 3% |
| User Preference (gender, language) | 2% |

After scoring, the **top 3 providers** are sent to Gemini which generates a human-readable explanation of *why* that specific provider was chosen — visible in the app as a reasoning trace.

### 3. Complexity Agent — `server/src/agents/complexity.ts`

Classifies how complex a job is before pricing.

| Level | Example | Multiplier |
|-------|---------|-----------|
| `basic` | AC gas refill | 1.0× |
| `intermediate` | AC not cooling, compressor issue | 1.3× |
| `complex` | Full AC overhaul, wiring issue | 1.6× |

Uses Gemini to assess based on issue description, service type, and provider's skill match.

### 4. Pricing Agent — `server/src/agents/pricing.ts`

Calculates a fair dynamic quote with full breakdown.

**Factors considered:**
- Provider's base rate from `rate_card`
- Job complexity multiplier (from Complexity Agent)
- Urgency surcharge (`emergency` = +40%, `today` = +15%)
- Distance cost (travel time × rate)
- Material estimate
- Demand level (time-of-day + area saturation)
- Loyalty discount for returning users

**Output:** Primary quote + optional budget-alternative with a different provider

### 5. Scheduling Agent — `server/src/agents/scheduling.ts`

Finds the best time slot given provider availability and existing bookings.

**Capabilities:**
- Reads provider's `availability` (working days)
- Checks `Firestore` for existing bookings on the same day
- Detects slot conflicts (two bookings at the same time)
- Proposes 3 alternative slots when primary is taken
- Automatically adds users to a waitlist when all slots are full
- Calculates travel buffer between consecutive jobs

### 6. Supervisor Agent — `server/src/agents/supervisor.ts`

The **orchestrator**. Manages the conversation state machine and routes each message to the correct sub-agent.

**Conversation stages:**
```
greeting → understanding → clarifying → matching → pricing 
→ scheduling → confirming → booked → tracking → feedback → dispute
```

Additional responsibilities:
- Manages `ChatSession` persistence in Firestore
- Creates and updates `Booking` documents
- Handles delay reporting (calls Scheduling Agent to push next booking)
- Processes ratings with Firestore transactional updates (atomically updates `stats.avg_rating`, `stats.rating_count`, `reviews[]`)
- Manages dispute detection and resolution prompts

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Mobile** | React Native + Expo SDK 52 | iOS & Android from single codebase |
| **Navigation** | React Navigation 6 | Stack + Bottom Tabs |
| **State** | React Context + AsyncStorage | Auth state, provider profile persistence |
| **Backend** | Node.js + Express | TypeScript, async/await throughout |
| **AI** | Google Gemini 2.5 Flash | Via `@google/generative-ai` SDK |
| **Database** | Firebase Firestore | Sessions, bookings, ratings, providers |
| **Auth** | Firebase Authentication | Email/password with AsyncStorage persistence |
| **Containerization** | Docker (multi-stage build) | Optimized for Google Cloud Run |
| **Build** | EAS Build (Expo) | APK generation with env injection |
| **Validation** | Zod | Runtime schema validation on all POST endpoints |
| **Rate Limiting** | `express-rate-limit` | 15 req/min on chat, 120 req/min general |

---

## APIs — Mock vs Real

Understanding what is live data vs. seeded demo data is critical for evaluation.

### Real / Live (Firebase-backed)

| Feature | Status | Details |
|---------|--------|---------|
| **User Auth** | ✅ Real | Firebase Authentication (email/password) |
| **Chat Sessions** | ✅ Real | Saved to Firestore `sessions` collection per user |
| **Bookings** | ✅ Real | Created in Firestore `bookings` collection when user confirms |
| **Ratings** | ✅ Real | Transactional write to Firestore — updates `avg_rating`, `rating_count`, appends review |
| **Provider Profile (onboarding)** | ✅ Real | Saved to Firestore + AsyncStorage on wizard completion |
| **Provider Dashboard Stats** | ✅ Real | Queries Firestore `bookings` by `provider_id`, computes earnings per day |
| **Booking Status Updates** | ✅ Real | `updateBooking()` writes to Firestore |
| **Online/Offline Toggle** | ✅ Real | `PUT /api/provider/status` updates server state, opportunity feed respects it |

### Seeded Demo Data (Mock Providers)

| Feature | Status | Details |
|---------|--------|---------|
| **Provider Catalogue** | 🟡 Seeded | 14 providers in `server/src/data/providers.ts` with realistic Pakistani names, areas, rates |
| **Provider Ratings** | 🟡 Seeded | Initial `avg_rating` and `trust_score` from seed data; real ratings layer on top via Firestore |
| **Service Categories** | 🟡 Seeded | 12 categories (`ac_repair`, `plumbing`, `electrical`, etc.) |
| **Opportunity Feed Demo** | 🟡 Demo Fallback | If no real pending bookings exist, returns 1 demo opportunity so screen is never blank |

> **Note:** The provider catalogue is seeded for demo purposes. In production, providers self-register through the onboarding wizard, and their data flows into Firestore. Real registered providers show up in matching when `provider_service.ts` is updated to query Firestore over the static array.

---

## Integrations

### Google Gemini API

- **SDK:** `@google/generative-ai`
- **Model:** `gemini-2.5-flash-preview-05-20`
- **Usage:** NLU parsing, provider matching rationale, complexity classification, pricing reasoning
- **Resilience:** 3-attempt exponential backoff (1s → 2s → 4s), 30-second per-call timeout, stateful circuit breaker (opens after 5 failures, auto-resets after 60s)
- **Key stored in:** `server/.env` as `GEMINI_API_KEY` — never committed to git

### Firebase / Firestore

- **SDK:** `firebase-admin` (server), `firebase` JS SDK (mobile)
- **Authentication:** Firebase Auth with email/password; session persisted in AsyncStorage on mobile
- **Firestore collections:**
  - `sessions` — chat conversation state, NLU context, booking in progress
  - `bookings` — full booking lifecycle documents
  - `providers/{id}/waitlist` — waitlist subcollection when all slots are taken
- **Credentials:** `server/firebase-service-account.json` (service account key, gitignored)

### Expo Application Services (EAS)

- **Purpose:** Build production APK with environment variables baked in at build time
- **Config:** `mobile/eas.json` with `development`, `preview`, `production` profiles
- **Dynamic config:** `mobile/app.config.js` (replaces static `app.json`) reads `EXPO_PUBLIC_API_URL` at build time

---

## Project Structure

```
Hackathon/
├── mobile/                          # React Native Expo app
│   ├── src/
│   │   ├── context/
│   │   │   └── AppContext.tsx       # Auth state, user role, provider profile
│   │   ├── services/
│   │   │   ├── api.ts               # All API calls with 3-tier URL resolver + timeouts
│   │   │   └── firebase.ts          # Firebase Auth initialization
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx       # Bookings feed, server health probe, offline banner
│   │   │   ├── ChatScreen.tsx       # AI chat interface with reasoning traces
│   │   │   ├── BookingsScreen.tsx   # Booking history with status tracking
│   │   │   ├── BookingDetailScreen.tsx
│   │   │   ├── CategoryScreen.tsx   # Service category browser
│   │   │   ├── LoginScreen.tsx      # Firebase auth (email/password)
│   │   │   ├── ProviderOnboardingScreen.tsx  # 4-step provider setup wizard
│   │   │   ├── ProviderProfileScreen.tsx
│   │   │   ├── RatingScreen.tsx     # Post-job rating with category breakdown
│   │   │   └── provider/
│   │   │       ├── ProviderDashboardScreen.tsx  # Live stats + opportunity feed
│   │   │       ├── OpportunityScreen.tsx        # Live opportunities + countdown timer
│   │   │       ├── ProviderScheduleScreen.tsx   # Real bookings calendar
│   │   │       └── ProviderEarningsScreen.tsx   # Weekly earnings + trust score
│   │   ├── navigation/              # Stack + Tab navigator config
│   │   └── theme/                   # Design tokens (colors, spacing, typography)
│   ├── app.config.js                # Dynamic Expo config for EAS build
│   ├── eas.json                     # EAS build profiles
│   └── .env                         # EXPO_PUBLIC_* variables (gitignored)
│
└── server/                          # Node.js Express API
    ├── src/
    │   ├── agents/
    │   │   ├── supervisor.ts        # Conversation orchestrator + booking lifecycle
    │   │   ├── nlu.ts               # Natural language understanding (Gemini)
    │   │   ├── matching.ts          # 11-factor provider ranking + Gemini rationale
    │   │   ├── complexity.ts        # Job complexity classification (Gemini)
    │   │   ├── pricing.ts           # Dynamic pricing engine (Gemini)
    │   │   └── scheduling.ts        # Slot finding, conflict detection, waitlist
    │   ├── services/
    │   │   ├── gemini.ts            # Gemini client + retry/timeout/circuit breaker
    │   │   ├── firebase-admin.ts    # Firestore Admin SDK init + getDB()
    │   │   ├── firestore-store.ts   # Session/booking CRUD + fetchAllBookings()
    │   │   └── provider-service.ts  # Provider queries (Firestore + mock fallback)
    │   ├── data/
    │   │   └── providers.ts         # 14 seeded demo providers
    │   ├── middleware/
    │   │   ├── validation.ts        # Zod schemas for all POST bodies
    │   │   └── error-handler.ts     # asyncHandler wrapper + centralized error response
    │   ├── utils/
    │   │   └── types.ts             # All TypeScript interfaces (Booking, Provider, etc.)
    │   └── index.ts                 # Express app + all route definitions
    ├── Dockerfile                   # Multi-stage production image
    ├── .dockerignore
    └── .env                         # GEMINI_API_KEY, PORT (gitignored)
```

---

## Getting Started — Local Development

### Prerequisites

- Node.js 18+
- A Firebase project (with Firestore and Authentication enabled)
- A Google Gemini API key
- Expo Go app on your phone (for mobile testing)

### 1. Clone & Install

```bash
git clone <repo-url>
cd Hackathon

# Install server dependencies
cd server && npm install

# Install mobile dependencies
cd ../mobile && npm install
```

### 2. Configure the Server

```bash
cd server
cp .env.example .env   # or create .env manually
```

Edit `server/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=development
```

Place your Firebase service account JSON at:

```
server/firebase-service-account.json
```

> Download from Firebase Console → Project Settings → Service Accounts → Generate New Private Key

### 3. Configure the Mobile App

```bash
cd mobile
```

Edit `mobile/.env`:

```env
# For local development (replace with your machine's LAN IP)
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api

# Firebase (from Firebase Console → Project Settings → Your Apps)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

> **3-Tier URL Fallback:** If `EXPO_PUBLIC_API_URL` is not set, the app auto-detects the server using Expo's LAN IP (`Constants.expoConfig.hostUri`). If that also fails, it falls back to `localhost:3000` for simulator testing.

### 4. Run the Server

```bash
cd server
npm run dev
# Server starts at http://localhost:3000
# Network URL printed in console — use this on your phone
```

### 5. Run the Mobile App

```bash
cd mobile
npx expo start
# Scan QR code with Expo Go app
```

### 6. Verify Everything Works

```bash
# Health check (should return status: "ok")
curl http://localhost:3000/api/health

# List providers
curl http://localhost:3000/api/providers
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |
| `PORT` | ❌ | Server port (default: `3000`) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `ALLOWED_ORIGINS` | ❌ | CORS origins for production (comma-separated) |

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | ❌ | Backend URL — auto-detected if not set |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase web API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase app ID |

---

## API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Deep health check — probes Firestore + Gemini circuit breaker |
| `GET` | `/api/categories` | List all 12 service categories |
| `GET` | `/api/providers` | List all providers (Firestore → mock fallback) |
| `POST` | `/api/chat` | Main AI chat endpoint (rate limited: 15/min) |
| `GET` | `/api/bookings` | List bookings for a user (`?user_id=`) |
| `PUT` | `/api/bookings/:id/status` | Update booking status |
| `POST` | `/api/bookings/:id/rate` | Submit rating (persisted to Firestore transaction) |
| `POST` | `/api/bookings/:id/delay` | Provider reports running late |

### Provider Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/provider/dashboard` | Real earnings, ratings, trust score by `provider_id` |
| `PUT` | `/api/provider/status` | Toggle online/offline — controls opportunity feed |
| `GET` | `/api/provider/opportunities` | Open unmatched bookings (empty when offline) |
| `POST` | `/api/provider/opportunities/:id/respond` | Accept (assigns provider, sets `confirmed`) or decline |
| `GET` | `/api/provider/bookings` | All bookings assigned to a provider |

### Health Check Response

```json
{
  "status": "ok",
  "service": "UstaJi API",
  "timestamp": "2026-05-20T19:00:00.000Z",
  "checks": {
    "firestore": "connected",
    "gemini": {
      "initialized": true,
      "circuit_open": false,
      "failure_count": 0
    }
  }
}
```

---

## Firestore Setup

The provider bookings and session queries require **composite indexes**. Deploy them before running in production:

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login and set your project
firebase login
firebase use your-project-id

# Deploy indexes (defined in firestore.indexes.json at repo root)
firebase deploy --only firestore:indexes
```

> **Without this step**, `GET /api/provider/bookings` and `GET /api/provider/dashboard` will silently fall back to in-memory data and log a Firestore index error.

---

## Deployment

### Google Cloud Run (Recommended)

```bash
# 1. Build and push Docker image
cd server
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ustaji-api

# 2. Deploy to Cloud Run
gcloud run deploy ustaji-api \
  --image gcr.io/YOUR_PROJECT_ID/ustaji-api \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,NODE_ENV=production

# 3. Get the deployment URL
gcloud run services describe ustaji-api --format 'value(status.url)'
```

### Mobile — Production APK

```bash
# Update mobile/.env with the Cloud Run URL
echo "EXPO_PUBLIC_API_URL=https://ustaji-api-xxxx-uc.a.run.app/api" >> mobile/.env

# Update eas.json production profile env block
# Then build:
cd mobile
eas build --profile production --platform android
```

### Docker (Local / Any Host)

```bash
cd server
docker build -t ustaji-api .
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -v $(pwd)/firebase-service-account.json:/app/firebase-service-account.json \
  ustaji-api
```

---

## Resilience & Production Hardening

UstaJi was built with production-grade resilience patterns from the ground up:

### Gemini API Resilience (`server/src/services/gemini.ts`)
- **Exponential backoff retries:** 3 attempts with 1s → 2s → 4s delays
- **Per-call timeout:** 30 seconds maximum per Gemini request
- **Circuit breaker:** Opens after 5 consecutive failures, auto-resets after 60 seconds — prevents cascading failures from bringing down the entire API

### Data Persistence
- **Firestore transactions:** Rating updates use atomic transactions to prevent race conditions on `avg_rating` and `rating_count`
- **Dual-store pattern:** All booking/session writes go to both Firestore and in-memory fallback, ensuring zero data loss during Firestore cold starts

### Mobile Resilience (`mobile/src/screens/HomeScreen.tsx`)
- **Server health probe on mount:** Checks `/api/health` when the app opens; shows amber "connecting" banner if server is unreachable
- **Fetch timeouts:** All API calls time out after 10 seconds (60 seconds for AI chat), preventing silent hangs
- **Retry UI:** Error states show explicit retry buttons — no blank screens

### API Security
- **Rate limiting:** Chat endpoint limited to 15 requests/minute; general endpoints 120/minute per IP
- **Input validation:** All POST bodies validated through Zod schemas before processing
- **Helmet:** Standard security headers on all responses
- **CORS:** Locked to specific origins in production via `ALLOWED_ORIGINS` env var
- **Non-root container:** Production Docker image runs as `node` user (not root)

---

## Team

Built for the Google Hackathon · Pakistan · 2026

*UstaJi — Connecting skilled hands with the homes that need them.*
