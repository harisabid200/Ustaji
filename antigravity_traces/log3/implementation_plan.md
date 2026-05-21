# UstaJi Codebase Audit & Production Hardening Plan

Full audit of the UstaJi codebase against best practices from **7 skills**: API Security, Node.js Best Practices, Firebase, GCP Cloud Run, Mobile Design, Frontend Design, Error Handling Patterns, and Expo Deployment.

---

## Audit Summary

| Domain | Current Grade | Issues Found | Critical |
|--------|:------------:|:------------:|:--------:|
| 🔐 **Security** | **D** | 9 | 5 |
| 🏗️ **Architecture** | **C+** | 6 | 2 |
| 📱 **Mobile/Frontend** | **B-** | 5 | 1 |
| ⚙️ **Code Quality** | **C** | 7 | 3 |
| ☁️ **Deployment Readiness** | **F** | 4 | 4 |
| **Overall** | **D+** | **31** | **15** |

---

## 🔐 SECURITY (9 Issues)

### 🚨 CRITICAL: API Key Exposed in `.env` (Committed to Disk)

> [!CAUTION]
> **Gemini API key `AIzaSyBnrDnSLPWGCSoEh7VMqk81gG60G5tOyEo` is stored in plain text** in [.env](file:///d:/Hackathon/server/.env). If this repo is ever pushed to GitHub, the key is compromised instantly.
> **Skill Reference**: `api-security-best-practices` — "Secrets: Environment variables only, never committed"

**Fix**: Rotate the key immediately after deployment. Add `.env` to `.gitignore` (already done ✅), but also ensure the key is never in git history.

---

### 🚨 CRITICAL: `firebase-service-account.json` on Disk

> [!CAUTION]
> The Firebase service account JSON file contains a **private key** with full admin access to your Firestore database. It is in `.gitignore` ✅ but lives on disk unencrypted.
> **Skill Reference**: `firebase` — "Hardcoded secrets → Reverse engineered → Use env + secure storage"

**Fix**: For Cloud Run, use GCP's built-in Application Default Credentials (ADC) instead of a file. For local dev, keep the file but never bundle it into Docker images.

---

### 🚨 CRITICAL: Zero Authentication on ALL API Endpoints

> [!WARNING]
> **Every single endpoint** (`/api/chat`, `/api/bookings`, `/api/providers`, `/api/provider/register`) is completely unauthenticated. Anyone with the URL can:
> - Read all bookings for any user
> - Register fake providers
> - Cancel anyone's booking
> - Impersonate any user in chat
>
> **Skill Reference**: `api-security-best-practices` — "Implement Authentication — Require authentication for protected endpoints"

**Fix**: Add Firebase Auth token verification middleware. The mobile app already collects phone numbers — wire it to real Firebase Auth and pass the `idToken` in `Authorization: Bearer <token>` headers.

---

### 🚨 CRITICAL: No Input Validation

> [!WARNING]
> The `/api/chat` endpoint accepts any string without sanitization. The `/api/provider/register` endpoint accepts any JSON body and writes it directly to Firestore. No schema validation anywhere.
> **Skill Reference**: `nodejs-best-practices` — "Validate at Boundaries: API entry point, before database operations"

**Fix**: Add Zod schemas for all request bodies. Validate before processing.

---

### 🚨 CRITICAL: No Rate Limiting

> [!WARNING]
> The `/api/chat` endpoint calls Gemini API (which costs money) on every request with zero rate limiting. A single script could drain your Gemini quota and your GCP budget in minutes.
> **Skill Reference**: `api-security-best-practices` — "Implement Rate Limiting — Protect against brute force and DDoS"

**Fix**: Add `express-rate-limit` middleware. Strict limits on `/api/chat` (expensive AI calls) and `/api/provider/register`.

---

### ⚠️ HIGH: No Security Headers (Helmet)

No `helmet` middleware. Missing: CSP, X-Frame-Options, HSTS, X-Content-Type-Options, etc.
**Skill Reference**: `api-security-best-practices` — "Use Security Headers — Implement Helmet.js"

---

### ⚠️ HIGH: CORS Set to `origin: true` (Open to All)

[index.ts L14-19](file:///d:/Hackathon/server/src/index.ts#L14-L19) — `origin: true` allows any website to call your API. In production, this should be restricted.

---

### ⚠️ MEDIUM: Error Messages Leak Stack Traces

[index.ts L36](file:///d:/Hackathon/server/src/index.ts#L36) — `error.message` is returned directly to the client. In production, internal errors should return generic messages.
**Skill Reference**: `nodejs-best-practices` — "Client gets: NO internal details (security!)"

---

### ⚠️ MEDIUM: Mobile Stores Auth Token in Plain Memory

[AppContext.tsx](file:///d:/Hackathon/mobile/src/context/AppContext.tsx) — The user object (including phone number) is only in React state. No `expo-secure-store` usage.
**Skill Reference**: `mobile-design` — "Tokens in AsyncStorage → Easily stolen → Use SecureStore / Keychain"

---

## 🏗️ ARCHITECTURE (6 Issues)

### 🚨 CRITICAL: No Layered Architecture

> [!IMPORTANT]
> [index.ts](file:///d:/Hackathon/server/src/index.ts) contains route definitions, business logic (trust score calculation), AND data access in the same file. This violates the Controller → Service → Repository pattern.
> **Skill Reference**: `nodejs-best-practices` — "Layered Structure: Controller handles HTTP, Service has business logic, Repository does data access"

**Fix**: Extract route handlers into controllers. Move `calculateTrustScore` to a service. Routes should be thin.

---

### 🚨 CRITICAL: Mixed Sync/Async Data Access

[supervisor.ts](file:///d:/Hackathon/server/src/agents/supervisor.ts#L14-L26) uses `getSessionSync` (in-memory Map) as the primary data path, with Firestore as a fire-and-forget write-behind cache. This means:
- Sessions are lost on server restart
- Two server instances would have different data
- Firestore reads are never used for sessions at startup

**Fix**: Make session management async-first. Read from Firestore on cache miss.

---

### ⚠️ HIGH: `addRating` Mutates Mock Data In-Memory

[supervisor.ts L397-411](file:///d:/Hackathon/server/src/agents/supervisor.ts#L397-L411) — When a rating is submitted, it modifies the `mockProviders` array in memory. This means:
- Ratings are lost on restart
- The mutation doesn't propagate to Firestore providers
- Two instances would have different rating data

---

### ⚠️ HIGH: No Graceful Shutdown

**Skill Reference**: `gcp-cloud-run` — "SIGTERM received, shutting down gracefully"

No `process.on('SIGTERM')` handler. On Cloud Run, the container gets 10 seconds to clean up. Without this, in-flight requests and Firestore writes may be dropped.

---

### ⚠️ MEDIUM: Categories Derived On-The-Fly

[index.ts L41-53](file:///d:/Hackathon/server/src/index.ts#L41-L53) — Categories are computed by scanning all providers on every request. Should be a cached/precomputed value.

---

### ⚠️ MEDIUM: No Health Check Depth

The `/api/health` endpoint returns `ok` without checking if Firebase or Gemini are actually working. A deep health check should verify downstream dependencies.

---

## 📱 MOBILE / FRONTEND (5 Issues)

### 🚨 CRITICAL: API URL Points to Localhost

[api.ts](file:///d:/Hackathon/mobile/src/services/api.ts#L22-L42) — The production APK will try to talk to `localhost:3000` or the local WiFi IP. This is the #1 blocker for distribution.

---

### ⚠️ HIGH: No Offline Handling

**Skill Reference**: `mobile-design` — "Offline Dependence: Does the feature break without network?"

Every screen makes live API calls with no caching, no optimistic updates, and no offline fallback. The app shows a blank screen if the network is down.

**Fix**: Add basic network status detection and show cached data when offline.

---

### ⚠️ MEDIUM: OTP is Simulated (Not Real Firebase Auth)

[LoginScreen.tsx L55-57](file:///d:/Hackathon/mobile/src/screens/LoginScreen.tsx#L55-L57) — OTP verification is faked. Any 4 digits work. [AppContext.tsx L47](file:///d:/Hackathon/mobile/src/context/AppContext.tsx#L47) — Login is a `setTimeout` simulation.

---

### ⚠️ MEDIUM: No Loading/Error States on Data Screens

Several screens (HomeScreen, CategoryScreen) do not show error recovery UI when API calls fail. Users hit a dead end.
**Skill Reference**: `mobile-design` — "No error recovery → Dead end → Retry + message"

---

### ⚠️ LOW: Touch Targets Not Audited

Some action buttons and links may be below the 44-48px minimum touch target.
**Skill Reference**: `mobile-design` — "Touch < 44-48px → Miss taps → Min touch target"

---

## ⚙️ CODE QUALITY (7 Issues)

### 🚨 CRITICAL: Excessive Use of `any` Type

Across the codebase: `Promise<any>`, `Record<string, any>`, function params typed as `any`. This defeats TypeScript's purpose and hides bugs.

---

### 🚨 CRITICAL: No Error Handling in AI Calls

[gemini.ts](file:///d:/Hackathon/server/src/services/gemini.ts#L31-L38) — `callGemini` throws raw errors on API failure. The supervisor catches some, but:
- No retry logic for transient failures
- No timeout on Gemini calls (could hang forever)
- No circuit breaker for repeated failures

**Skill Reference**: `error-handling-patterns` — "Implementing retry and circuit breaker patterns"

---

### 🚨 CRITICAL: No Request Timeout

No timeout middleware on Express. A slow Gemini response could hold a connection open indefinitely, exhausting server resources.

---

### ⚠️ HIGH: `console.log` Used for Production Logging

No structured logging (winston, pino). `console.log` is synchronous and blocks the event loop.
**Skill Reference**: `nodejs-best-practices` — "console.log in prod → JS thread block → Strip logs or use structured logger"

---

### ⚠️ MEDIUM: No TypeScript Strict Mode

`tsconfig.json` likely doesn't enable `strict: true`, allowing implicit `any` and null safety issues.

---

### ⚠️ MEDIUM: Frontend API Service Has No Timeout

[api.ts](file:///d:/Hackathon/mobile/src/services/api.ts) — `fetch` calls have no timeout except `checkHealth`. A hung server means the app freezes.

---

### ⚠️ LOW: No Unit or Integration Tests

Zero test files in the entire codebase. No test script in `package.json`.

---

## ☁️ DEPLOYMENT READINESS (4 Issues — ALL CRITICAL)

### 🚨 No Dockerfile

**Skill Reference**: `gcp-cloud-run` — "Multi-stage build for smaller image"

Cannot deploy to Cloud Run without a container definition.

---

### 🚨 No `.dockerignore`

Without this, `node_modules`, `.env`, and `firebase-service-account.json` would be copied into the Docker image, bloating it and leaking secrets.

---

### 🚨 No Cloud Run Configuration

No `cloudbuild.yaml`, no `app.yaml`, no deployment scripts. No environment variable mapping for Cloud Run's `PORT` variable.

---

### 🚨 No EAS / APK Build Configuration

No `eas.json` in the mobile directory. No build profiles for generating a production APK.
**Skill Reference**: `expo-deployment` — "Use EAS Build for reliable production builds"

---

## Proposed Fix Plan (Priority Order)

### Phase 1: Security Hardening (Do FIRST — blocks deployment)

| # | Fix | File(s) | Effort |
|---|-----|---------|--------|
| 1 | Add `helmet` middleware | `server/src/index.ts` | 5 min |
| 2 | Add `express-rate-limit` (10/min on chat, 100/min general) | `server/src/index.ts` | 10 min |
| 3 | Add Zod input validation schemas for `/api/chat`, `/api/provider/register`, `/api/bookings/:id/rate` | `server/src/middleware/validation.ts` [NEW] | 20 min |
| 4 | Restrict CORS to production URL | `server/src/index.ts` | 5 min |
| 5 | Sanitize error responses (no stack traces in production) | `server/src/middleware/error-handler.ts` [NEW] | 10 min |

---

### Phase 2: Deployment Infrastructure (Unblocks APK sharing)

| # | Fix | File(s) | Effort |
|---|-----|---------|--------|
| 6 | Create multi-stage `Dockerfile` | `server/Dockerfile` [NEW] | 10 min |
| 7 | Create `.dockerignore` | `server/.dockerignore` [NEW] | 2 min |
| 8 | Add graceful shutdown handler (`SIGTERM`) | `server/src/index.ts` | 5 min |
| 9 | Update PORT to read from env (Cloud Run uses 8080) | `server/src/index.ts` | 2 min |
| 10 | Create `eas.json` with APK build profile | `mobile/eas.json` [NEW] | 5 min |
| 11 | Add production API URL config | `mobile/src/services/api.ts` | 5 min |

---

### Phase 3: Architecture & Reliability

| # | Fix | File(s) | Effort |
|---|-----|---------|--------|
| 12 | Add request timeout middleware (30s default, 60s for chat) | `server/src/index.ts` | 5 min |
| 13 | Add retry logic to Gemini calls (3 retries with exponential backoff) | `server/src/services/gemini.ts` | 15 min |
| 14 | Fix `addRating` to update Firestore providers (not just in-memory) | `server/src/agents/supervisor.ts` | 10 min |
| 15 | Deep health check (verify Firebase + Gemini connectivity) | `server/src/index.ts` | 10 min |
| 16 | Add fetch timeout to all mobile API calls (10s default) | `mobile/src/services/api.ts` | 10 min |
| 17 | Add basic offline detection + cached fallback on HomeScreen | `mobile/src/screens/HomeScreen.tsx` | 15 min |

---

### Phase 4: Polish (Post-Launch)

| # | Fix | Effort |
|---|-----|--------|
| 18 | Replace `console.log` with structured logger (pino) | 15 min |
| 19 | Enable TypeScript strict mode and fix resulting errors | 30 min |
| 20 | Add integration tests for critical paths (chat, booking, rating) | 45 min |
| 21 | Wire real Firebase Auth OTP on mobile | 30 min |
| 22 | Reduce `any` usage across codebase | 30 min |

---

## Verification Plan

### Automated
- `curl` health check after Cloud Run deployment
- Test rate limiting: 11 rapid requests → 429 on 11th
- Test validation: malformed JSON → 400 with clear error
- Test auth: request without token → 401

### Manual
- Full user flow on APK: Login → Chat → Book → Rate
- Verify provider registration persists in Firestore
- Kill server, restart, verify bookings still exist
- Test on airplane mode → app shows graceful offline state

---

> [!IMPORTANT]
> **Phases 1 & 2 are blockers.** You cannot share the APK until the backend is deployed and the mobile app points to the public URL. Shall I begin executing Phase 1 (Security Hardening)?
