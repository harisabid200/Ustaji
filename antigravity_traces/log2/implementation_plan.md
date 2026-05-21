# UstaJi — Full Marketplace Implementation Plan

> All design decisions resolved. Ready for execution.

## Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | App structure | **Single app** — login determines user vs provider screens |
| 2 | Authentication | **Firebase Auth** with phone OTP |
| 3 | Category tap behavior | **Option C** — provider list + floating "Chat with UstaJi" button |
| 4 | UI theme | **Light mode** — white/gray/emerald (NOT dark) |
| 5 | Provider app | Same app, provider tabs shown based on login role |

---

## What We're Building

### User Side
- **Login** → Phone auth + role selection
- **Home Screen** → Category cards, search bar, recent bookings, nearby providers
- **Category Screen** → Provider list with filters + floating chat CTA
- **Chat Screen** → AI assistant with live reasoning panel
- **Bookings Screen** → Active / Past / Cancelled
- **Booking Detail** → Status timeline, reasoning traces, actions, rating
- **Rating Screen** → Stars, category-specific scores, review text
- **Provider Profile** → Trust score, reviews, rate card, book now

### Provider Side
- **Dashboard** → Today's stats, incoming opportunities, online/offline toggle
- **Opportunities** → Job requests with accept/decline + timer
- **Schedule** → Calendar with upcoming jobs, status updates
- **Earnings** → Revenue summary, trust score, review trends

### Backend Additions
- Category & provider list APIs
- Rating & trust score system
- Provider opportunity matching
- Scheduling agent
- Dynamic reasoning narratives (Gemini)

---

## Execution Phases

### Phase 1: Foundation (P0) — Build First
1. Switch theme from dark → light
2. Navigation infrastructure (role-based tabs + stack)
3. Login screen (Firebase Auth simulation initially)
4. Home screen with category cards
5. Category → Provider list screen + floating chat CTA

### Phase 2: Core User Journey (P0) — Build Second
6. Enhanced ChatScreen with reasoning panel
7. Bookings list screen (Active/Past/Cancelled)
8. Booking detail with status timeline
9. Rating/review screen
10. Backend: rating API + trust score calculation

### Phase 3: Provider Side (P1) — Build Third
11. Provider dashboard
12. Opportunity feed (accept/decline)
13. Provider schedule management
14. Provider earnings & trust score view
15. Backend: provider APIs + opportunity matching

### Phase 4: Polish (P2) — Build Last
16. Dynamic AI reasoning narratives (Gemini-generated)
17. Scheduling agent (conflict detection)
18. Provider profile screen with trust score visual
19. End-to-end demo polish

---

## Files Updated

| File | What Changed |
|------|-------------|
| [agent.md](file:///d:/Hackathon/agent.md) | Full rewrite — reflects marketplace platform, light theme, role-based app, Option C, provider side |
| [implementation_plan.md](file:///d:/Hackathon/implementation_plan.md) | Full rewrite — same updates, detailed component design, API design, execution phases |

---

## Scope: ~33 new files, ~7 modified files

Ready to begin execution on your approval.
