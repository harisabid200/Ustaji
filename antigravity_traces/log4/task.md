# Task Checklist: UstaJi Agentic Upgrade

## Phase 1: NLU Refactoring (Agentic Tool Calling)
- [x] Update `gemini.ts` to support `callGeminiWithTools` and define `Tool` structures.
- [x] Create `extract_service_intent` schema matching the required NLU structure.
- [x] Refactor `runNLUAgent` in `server/src/agents/nlu.ts` to use tool calling instead of string parsing.
- [x] Add graceful fallback to existing keyword/mock logic if Gemini tool call fails.

## Phase 2: Data & Scope Expansion
- [x] Update `server/src/data/providers.ts` to include latitude/longitude coordinates for major Pakistani cities (Lahore, Karachi, Peshawar, Quetta).
- [x] Add mock providers for these new cities to enable proper testing of dynamic location matching.

## Phase 3: AI-Driven Reasoning in Matching
- [x] Refactor `runMatchingAgent` in `server/src/agents/matching.ts` to accept a dynamic user location (falling back to NLU location if needed).
- [x] Implement a Gemini call within the matching agent to dynamically generate a natural language rationale (Urdu/English) comparing the top provider against the runner-up.
- [x] Update `server/src/agents/supervisor.ts` to pass user context (lat/lng) into the matching agent if available in the session.

## Phase 4: UI Onboarding Updates
- [x] Update `ProviderOnboardingScreen.tsx` (mobile) to replace the hardcoded "Islamabad-only" sector selection.
- [x] Implement a generic City selection chip list and an optional "Specific Area" text input field for nationwide onboarding.
- [x] Ensure the combined location data is correctly saved to the provider profile context.
