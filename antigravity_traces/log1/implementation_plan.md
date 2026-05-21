# Budget-Aware Provider Matching

When a user says "mujhe 3000 ke andar AC repair chahiye" or "budget is 5000 max", the system should **actually filter and rank providers** who can serve within that budget — not just say "I'm searching".

## Current Gap Analysis

The pipeline has the **types** for budget but doesn't wire them end-to-end:

| Component | Has Budget? | Actually Uses It? |
|---|---|---|
| `types.ts` | ✅ `max_budget?: number` field exists | — |
| `nlu.ts` (Gemini tool) | ❌ No `max_budget` in tool schema | Never extracted |
| `nlu.ts` (keyword fallback) | ❌ No budget number parsing | Never extracted |
| `matching.ts` | ⚠️ Uses `budget_sensitivity` for scoring | No hard-cap filtering |
| `pricing.ts` | ❌ Ignores `max_budget` entirely | No over-budget warning |
| `supervisor.ts` | ❌ Never passes budget to downstream agents | No budget feedback loop |

## Proposed Changes

### NLU Agent — Extract `max_budget`

#### [MODIFY] [nlu.ts](file:///d:/Hackathon/server/src/agents/nlu.ts)

1. **Add `max_budget` to Gemini tool schema** (line ~83): Add a new optional numeric field:
   ```
   max_budget: { type: NUMBER, description: "Explicit maximum budget in PKR if user mentions a number, e.g. 3000, 5000. null if not mentioned." }
   ```

2. **Wire the extracted value** into `NLUResult.constraints.max_budget` (line ~140):
   ```ts
   constraints: {
     budget_sensitivity: args.budget_sensitivity || 'medium',
     max_budget: args.max_budget || undefined,  // ← NEW
     gender_preference: 'any'
   }
   ```

3. **Add keyword fallback parsing** (line ~220): Parse numeric budget from messages like "3000 rupay", "budget 5k", "5000 ke andar":
   ```ts
   const budgetMatch = lowered.match(/(\d+)\s*(k|hazar|hazaar|thousand)?.*?(budget|rupay|rupee|rs|pkr|ke andar|mein|tak)/i)
     || lowered.match(/(budget|max|upto|under)\s*(\d+)\s*(k|hazar)?/i);
   const maxBudget = budgetMatch ? parseBudgetNumber(budgetMatch) : undefined;
   ```

---

### Matching Agent — Hard-Cap Budget Filter

#### [MODIFY] [matching.ts](file:///d:/Hackathon/server/src/agents/matching.ts)

1. **Accept `max_budget`** in function signature (line ~258):
   ```ts
   export async function runMatchingAgent(
     nlu: NLUResult,
     contextLat?: number,
     contextLng?: number
   )
   ```
   No signature change needed — `max_budget` is already inside `nlu.constraints.max_budget`.

2. **Post-scoring filter** (after line ~333): After scoring all candidates, if `max_budget` is set, filter out providers whose average rate exceeds the budget:
   ```ts
   if (nlu.constraints.max_budget) {
     const budget = nlu.constraints.max_budget;
     ranked = ranked.filter(r => {
       const rates = Object.values(r.provider.rate_card);
       const avgRate = rates.length > 0 ? rates.reduce((a,b) => a+b, 0) / rates.length : 0;
       return avgRate <= budget * 1.2; // 20% tolerance — pricing agent applies exact multipliers
     });
   }
   ```

3. **Boost price weight** when budget is specified: If `max_budget` is set, temporarily increase the `price` weight from 0.09 → 0.18 (doubling its importance) so budget-friendly providers rank higher.

---

### Pricing Agent — Budget Enforcement + Alternatives

#### [MODIFY] [pricing.ts](file:///d:/Hackathon/server/src/agents/pricing.ts)

1. **Accept and check `max_budget`** (line ~104): After computing `primaryQuote.total`, check if it exceeds the user's budget:
   ```ts
   const overBudget = nlu.constraints.max_budget && primaryQuote.total > nlu.constraints.max_budget;
   ```

2. **Always find a budget alternative** when user specified a max budget (not just when `budget_sensitivity === 'high'`):
   ```ts
   if ((nlu.constraints.max_budget || nlu.constraints.budget_sensitivity === 'high') && rankedProviders.length > 1) {
     // Find cheapest provider that fits within budget
   }
   ```

3. **Add `over_budget` flag** to the result so the supervisor can warn the user:
   ```ts
   result.over_budget = overBudget;
   result.user_budget = nlu.constraints.max_budget;
   ```

---

### Supervisor — Budget-Aware Response Generation

#### [MODIFY] [supervisor.ts](file:///d:/Hackathon/server/src/agents/supervisor.ts)

1. **Pass budget context to response generation** (line ~212): Add budget info to the `contextData` object:
   ```ts
   budget: {
     max_budget: nlu.constraints.max_budget,
     over_budget: pricingResult.over_budget,
     quoted_total: pricingResult.primary_quote.total,
     budget_alt: pricingResult.budget_alternative,
   }
   ```

2. **Enhanced fallback response** (line ~220): If the primary quote exceeds the budget, the fallback message should explicitly say so and suggest the budget alternative.

---

## Verification Plan

### Automated Tests
Run the server locally and test with these messages via the chat API:
- `"AC repair chahiye G-13 mein, budget 3000 tak"` → should extract `max_budget: 3000` and filter providers
- `"plumber chahiye, 2000 rupay ke andar"` → should extract `max_budget: 2000`  
- `"electrician chahiye"` (no budget) → should work as before with no filtering
- `"sasta AC repair F-8"` → should set `budget_sensitivity: high` + find budget alternatives

### Manual Verification
- Open the app, type a budget-constrained request, and verify the AI response mentions the budget and shows providers within range
- If the best provider exceeds budget, verify it warns and suggests a cheaper alternative
