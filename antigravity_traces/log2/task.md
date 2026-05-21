# UstaJi — Implementation Task Tracker

## Phase 1: Foundation (P0) ✅ DONE
- `[x]` Switch theme to light mode (`mobile/src/theme/index.ts`)
- `[x]` Navigation infrastructure — role-based tabs + stack navigator (`AppNavigator`, `UserTabs`, `ProviderTabs`)
- `[x]` AppContext — user, role, auth state (`AppContext.tsx`)
- `[x]` Login screen (phone + role selection, simulated auth + demo button)
- `[x]` Home screen (category cards grid, AI CTA, search bar, recent bookings)
- `[x]` Category screen (provider list + filters + floating "Chat with UstaJi" CTA)
- `[x]` Backend: `/api/categories` endpoint
- `[x]` App.tsx updated to use AppProvider + AppNavigator

## Phase 2: Core User Journey (P0) ✅ DONE
- `[/]` ChatScreen revamp — light theme + reasoning panel (needs light theme polish)
- `[x]` Bookings list screen (Active / Past / Cancelled tabs)
- `[x]` Booking detail screen (status timeline, reasoning, actions)
- `[x]` Rating screen (stars, category scores, review text)
- `[x]` Provider profile screen (trust score, reviews, book now)
- `[x]` Profile screen (user info, switch to provider, menu, logout)
- `[x]` Backend: rating API + trust score calculation
- `[x]` Backend: booking cancel/status update endpoints
- `[x]` Backend: provider profile endpoint with trust score
- `[x]` api.ts expanded with all new methods

## Phase 3: Provider Side (P1) ✅ DONE
- `[x]` Provider dashboard (today's stats, opportunities, online/offline toggle)
- `[x]` Opportunity screen (accept/decline, timer, match score)
- `[x]` Provider schedule screen (calendar + job status update buttons)
- `[x]` Provider earnings screen (bar chart, trust score breakdown)
- `[x]` Backend: provider dashboard API
- `[x]` Backend: opportunities API
- `[x]` Backend: provider status update API

## Phase 4: Polish (P2) — IN PROGRESS
- `[ ]` ChatScreen light theme + reasoning panel polish
- `[ ]` Dynamic AI reasoning narratives via Gemini in matching agent
- `[ ]` Scheduling agent (conflict detection)
- `[ ]` Start server and run full smoke test
- `[ ]` End-to-end demo flow test
