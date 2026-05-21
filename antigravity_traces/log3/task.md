# Provider Side Fix — Task Tracker

## Server Fixes
- [x] **S1** Added `fetchAllBookings()` to firestore-store — real Firestore collection-wide query, not broken `'*'` wildcard
- [x] **S2** Fixed `/api/provider/opportunities` — uses `fetchAllBookings`, filters unassigned pending bookings, respects online status, matches provider services
- [x] **S3** Fixed `/api/provider/opportunities/:id/respond` — calls `updateBooking()` to assign provider_id + set status to `confirmed` in Firestore
- [x] **S4** Added `PUT /api/provider/status` — in-memory online/offline toggle, opportunities endpoint checks this before returning results
- [x] **S5** Added `GET /api/provider/bookings` — real Firestore query via `fetchProviderBookings()`
- [x] Fixed `/api/provider/dashboard` — uses `fetchProviderBookings`, returns real avg_rating, trust_score, weekly_earnings map

## Mobile Fixes
- [x] **M1** `AppContext` — persists `providerProfile` to `@profile_{uid}` AsyncStorage key, restores on auth state change
- [x] **M2** `ProviderDashboardScreen` — connected Accept/Decline to API with provider_id, real earnings from server, online toggle calls server, loading spinner on respond actions
- [x] **M3** `OpportunityScreen` — replaced MOCK_OPPS with real API, live countdown timer (ticks every second, auto-expires at 0), pull-to-refresh, loading states
- [x] **M4** `ProviderScheduleScreen` — replaced MOCK_JOBS with real `getProviderBookings` API, status updates call `updateBookingStatus`, real ISO timestamp formatting, loading states
- [x] **M5** `ProviderEarningsScreen` — loads real weekly earnings from dashboard API, real avg rating, empty state for new providers

## Bug Fixes
- [x] Added `description` and `customer_name` optional fields to `Booking` type
- [x] Fixed `firebase.ts` mobile import (getReactNativePersistence now uses require() for native-only path)

## Verified ✅
- Server TS: `SERVER_OK`
- Mobile TS: `MOBILE_OK`
- `/api/health`: `{ status: "ok", firestore: "connected" }`
- `/api/provider/opportunities`: returns demo opp with description field
- `/api/provider/dashboard?provider_id=prov-001`: returns real avg_rating (4.8), trust_score (97), weekly_earnings map
- `/api/provider/bookings`: returns `{ bookings: [], total: 0 }` correctly
