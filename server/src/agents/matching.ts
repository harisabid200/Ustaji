import { NLUResult, Provider, RankedProvider, MatchingFactorScore, AgentTrace } from '../utils/types';
import { mockProviders } from '../data/providers';
import { getOrGenerateProviders } from '../services/provider-service';
import { v4 as uuid } from 'uuid';
import { callGemini, isGeminiAvailable } from '../services/gemini';

// ── Weights — must sum to 1.0 ──────────────────────────────
// Each factor contributes (score 0-10) × weight × 10 → total out of ~100
const WEIGHTS: Record<keyof MatchingFactorScore, number> = {
  distance:        0.13,  // F1: Physical proximity + travel time
  availability:    0.11,  // F2: Works the requested day/time
  rating:          0.12,  // F3: Time-weighted star rating
  review_recency:  0.07,  // F4: How fresh are the reviews?
  on_time:         0.11,  // F5: Reliability / punctuality history
  specialization:  0.12,  // F6: Skill + cert + experience match
  price:           0.09,  // F7: Price vs budget preference
  capacity:        0.08,  // F8: Remaining job slots for the day
  cancellation:    0.08,  // F9: Low cancellation rate = good
  user_preference: 0.05,  // F10: Gender/language match
  risk_score:      0.04,  // F11: Composite penalty (flags)
};

// ── Haversine distance (km) ───────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── F1: Distance + Travel Time ────────────────────────────────
// Scoring: 0km→10, 3km→9, 7km→7, 15km→4, 30km+→1
function scoreDistance(provider: Provider, userLat: number, userLng: number): { score: number; km: number; label: string } {
  const km = haversineKm(userLat, userLng, provider.location.lat, provider.location.lng);
  const travelMin = Math.round(km * 3.5); // ~3.5 min/km in Pakistani city traffic
  let score: number;
  let label: string;

  if (km <= 1)       { score = 10; label = `Excellent — ${km.toFixed(1)}km away (~${travelMin} min)`; }
  else if (km <= 3)  { score = 9;  label = `Very close — ${km.toFixed(1)}km (~${travelMin} min drive)`; }
  else if (km <= 7)  { score = 7;  label = `Nearby — ${km.toFixed(1)}km (~${travelMin} min)`; }
  else if (km <= 15) { score = 5;  label = `Moderate — ${km.toFixed(1)}km (~${travelMin} min)`; }
  else if (km <= 30) { score = 3;  label = `Far — ${km.toFixed(1)}km (~${travelMin} min)`; }
  else               { score = 1;  label = `Very far — ${km.toFixed(1)}km (~${travelMin} min)`; }

  return { score, km: Math.round(km * 10) / 10, label };
}

// ── F2: Availability ──────────────────────────────────────────
// Exact day + time-slot match = 10, available but wrong slot = 5, unavailable = 0
function scoreAvailability(provider: Provider, nlu: NLUResult): { score: number; label: string } {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDate = nlu.time_preference.specific_date
    ? new Date(nlu.time_preference.specific_date)
    : new Date(Date.now() + (nlu.time_preference.urgency === 'today' ? 0 : 86400000));
  const dayName = dayNames[targetDate.getDay()];
  const slots = provider.availability[dayName] || [];

  if (slots.length === 0) return { score: 0, label: `Unavailable on ${dayName}` };

  const slotMap: Record<string, number[]> = {
    morning:   [7, 8, 9, 10, 11],
    afternoon: [12, 13, 14, 15],
    evening:   [16, 17, 18, 19],
    night:     [20, 21, 22],
  };

  if (!nlu.time_preference.preferred_slot) {
    return { score: 7, label: `Available ${slots.length} slot(s) on ${dayName}` };
  }

  const preferredHours = slotMap[nlu.time_preference.preferred_slot] || [];
  for (const slot of slots) {
    const startHour = parseInt(slot.split('-')[0].split(':')[0]);
    if (preferredHours.includes(startHour)) {
      return { score: 10, label: `Perfect — available ${nlu.time_preference.preferred_slot} on ${dayName}` };
    }
  }
  return { score: 4, label: `Available on ${dayName} but not in preferred ${nlu.time_preference.preferred_slot} slot` };
}

// ── F3: Rating (time-weighted exponential decay) ─────────────
// Recent reviews carry more weight (90-day half-life)
function scoreRating(provider: Provider): { score: number; label: string } {
  if (provider.reviews.length === 0) {
    const score = provider.stats.avg_rating * 2;
    return { score, label: `${provider.stats.avg_rating}★ (${provider.stats.rating_count} ratings, no text reviews)` };
  }
  const now = Date.now();
  let weightedSum = 0, weightSum = 0;
  for (const review of provider.reviews) {
    const ageDays = (now - new Date(review.created_at).getTime()) / 86400000;
    const weight = Math.exp(-ageDays / 90);
    weightedSum += review.rating * weight;
    weightSum += weight;
  }
  const weighted = weightSum > 0 ? (weightedSum / weightSum) : provider.stats.avg_rating;
  const score = Math.min(10, weighted * 2);
  return { score: Math.round(score * 10) / 10, label: `${provider.stats.avg_rating}★ avg (${provider.stats.rating_count} ratings, weighted recent: ${weighted.toFixed(1)}★)` };
}

// ── F4: Review Recency ────────────────────────────────────────
function scoreReviewRecency(provider: Provider): { score: number; label: string } {
  if (provider.reviews.length === 0) return { score: 3, label: 'No reviews yet' };
  const latest = new Date(provider.reviews[0].created_at);
  const daysSince = (Date.now() - latest.getTime()) / 86400000;
  if (daysSince < 7)  return { score: 10, label: `Very fresh — reviewed ${Math.round(daysSince)} days ago` };
  if (daysSince < 30) return { score: 8,  label: `Recent — reviewed ${Math.round(daysSince)} days ago` };
  if (daysSince < 90) return { score: 5,  label: `Moderate — last review ${Math.round(daysSince)} days ago` };
  return { score: 2, label: `Stale — last review ${Math.round(daysSince / 30)} months ago` };
}

// ── F5: Reliability / On-Time Score ──────────────────────────
function scoreOnTime(provider: Provider): { score: number; label: string } {
  const pct = provider.stats.on_time_percentage;
  const score = pct / 10;
  let label: string;
  if (pct >= 95)      label = `Excellent punctuality — ${pct}% on-time`;
  else if (pct >= 85) label = `Good reliability — ${pct}% on-time`;
  else if (pct >= 75) label = `Average — ${pct}% on-time`;
  else                label = `⚠️ Poor punctuality — only ${pct}% on-time`;
  return { score, label };
}

// ── F6: Skill Specialization ──────────────────────────────────
function scoreSpecialization(provider: Provider, nlu: NLUResult): { score: number; label: string } {
  const serviceMatch = provider.service_types.includes(nlu.service_type);
  if (!serviceMatch) return { score: 0, label: 'Does not offer this service' };

  const subtype = (nlu.service_subtype || '').toLowerCase();
  const skillMatch = subtype
    ? provider.skills.some(s => s.toLowerCase().includes(subtype) || subtype.includes(s.toLowerCase()))
    : false;
  const hasCerts = provider.certifications.length > 0;
  const expBonus = Math.min(provider.experience_years / 15, 1) * 2;

  let score = 5;
  const reasons: string[] = [`${provider.experience_years}yr experience`];
  if (skillMatch) { score += 2; reasons.push(`skill match: ${subtype}`); }
  if (hasCerts)   { score += 1.5; reasons.push(provider.certifications.join(', ')); }
  score += expBonus;

  return { score: Math.min(10, score), label: reasons.join(' | ') };
}

// ── F7: Price Competitiveness ──────────────────────────────────
const MARKET_AVG_PKR: Record<string, number> = {
  ac_repair: 2000, plumbing: 1500, electrical: 1800,
  cleaning: 2500, carpentry: 3000, painting: 4000,
  default: 2500,
};
function scorePrice(provider: Provider, nlu: NLUResult): { score: number; label: string } {
  if (nlu.constraints.budget_sensitivity === 'low') {
    return { score: 7, label: 'Budget not a concern' };
  }
  const rates = Object.values(provider.rate_card);
  if (rates.length === 0) return { score: 5, label: 'Rate card not available' };
  const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  const market = MARKET_AVG_PKR[nlu.service_type] || MARKET_AVG_PKR.default;
  const ratio = avgRate / market;

  let score: number, label: string;
  if (nlu.constraints.budget_sensitivity === 'high') {
    if (ratio < 0.8)       { score = 10; label = `Budget-friendly — PKR ${Math.round(avgRate)} (${Math.round((1-ratio)*100)}% below market)`; }
    else if (ratio < 1.0)  { score = 7;  label = `Affordable — PKR ${Math.round(avgRate)}`; }
    else if (ratio < 1.3)  { score = 4;  label = `Above average — PKR ${Math.round(avgRate)}`; }
    else                   { score = 2;  label = `Expensive — PKR ${Math.round(avgRate)} (${Math.round((ratio-1)*100)}% above market)`; }
  } else {
    score = ratio < 1.2 ? 8 : 5;
    label = `PKR ${Math.round(avgRate)} vs market avg PKR ${market}`;
  }
  return { score, label };
}

// ── F8: Capacity ─────────────────────────────────────────────
// How many job slots are still free today?
function scoreCapacity(provider: Provider): { score: number; label: string } {
  // We don't have real-time booking counts yet — use total_jobs as proxy for busy-ness
  const max = provider.max_jobs_per_day;
  // Estimate: if >300 jobs, likely busy; <50 likely has capacity
  // For now score purely on max_jobs_per_day capacity ceiling
  if (max >= 6)  return { score: 10, label: `High capacity — up to ${max} jobs/day` };
  if (max >= 4)  return { score: 8,  label: `Good capacity — ${max} jobs/day` };
  if (max >= 2)  return { score: 5,  label: `Limited capacity — ${max} jobs/day` };
  return { score: 2, label: `Very limited — only ${max} job/day` };
}

// ── F9: Cancellation Rate ────────────────────────────────────
function scoreCancellation(provider: Provider): { score: number; label: string } {
  const rate = provider.stats.cancellation_rate;
  let score: number, label: string;
  if (rate <= 2)       { score = 10; label = `Excellent — only ${rate}% cancellations`; }
  else if (rate <= 5)  { score = 8;  label = `Low cancellation rate — ${rate}%`; }
  else if (rate <= 10) { score = 5;  label = `Moderate — ${rate}% cancellation rate`; }
  else                 { score = 2;  label = `⚠️ High cancellation rate — ${rate}%`; }
  return { score, label };
}

// ── F10: User Preference Match ────────────────────────────────
function scoreUserPreference(provider: Provider, nlu: NLUResult): { score: number; label: string } {
  let score = 5; // baseline neutral
  const reasons: string[] = [];

  // Gender preference
  const genderPref = nlu.constraints.gender_preference;
  if (genderPref && genderPref !== 'any') {
    if (provider.gender === genderPref) {
      score += 3;
      reasons.push(`Gender match (${genderPref})`);
    } else {
      score -= 2;
      reasons.push(`Gender mismatch (user prefers ${genderPref}, provider is ${provider.gender})`);
    }
  }

  // Language preference
  const langPref = nlu.constraints.language_preference;
  if (langPref) {
    if (provider.languages.includes(langPref.toLowerCase())) {
      score += 2;
      reasons.push(`Speaks ${langPref}`);
    } else {
      reasons.push(`Does not speak preferred ${langPref}`);
    }
  }

  // Verified bonus
  if (provider.verified) { score += 1; reasons.push('Verified provider'); }

  score = Math.max(0, Math.min(10, score));
  return { score, label: reasons.length > 0 ? reasons.join(' | ') : 'No specific preferences' };
}

// ── F11: Risk Score (composite penalty) ──────────────────────
function scoreRisk(provider: Provider): { score: number; label: string; flags: string[] } {
  const flags: string[] = [];
  let penalty = 0;

  if (provider.stats.cancellation_rate > 10) { flags.push('High cancellation rate'); penalty += 2; }
  if (provider.stats.on_time_percentage < 75) { flags.push('Low punctuality'); penalty += 2; }
  if (!provider.verified)                     { flags.push('Unverified'); penalty += 1.5; }
  if (provider.stats.avg_rating < 3.5)        { flags.push('Below-avg rating'); penalty += 2; }
  if (provider.stats.rating_count < 10)       { flags.push('Very few reviews'); penalty += 1; }

  const recentBad = provider.reviews.filter(r =>
    r.sentiment_score < 0.3 && new Date(r.created_at) > new Date(Date.now() - 30 * 86400000)
  );
  if (recentBad.length >= 2) { flags.push(`${recentBad.length} recent negative reviews`); penalty += 2; }

  const score = Math.max(0, 10 - penalty);
  const label = flags.length === 0 ? 'Clean record — no risk flags' : `Risk flags: ${flags.join(', ')}`;
  return { score, label, flags };
}

// ── Main Matching Agent ───────────────────────────────────────
export async function runMatchingAgent(
  nlu: NLUResult,
  contextLat?: number,
  contextLng?: number
): Promise<{ ranked: RankedProvider[]; trace: AgentTrace }> {

  const city = nlu.location.resolved?.city || nlu.location.raw || 'Islamabad';

  // Source 1: Firestore (real providers) or AI-generated for this city
  let candidates: Provider[] = await getOrGenerateProviders(city, nlu.service_type, 6);

  // Source 2: Fallback to static mock array
  if (candidates.length === 0) {
    candidates = mockProviders.filter(p => p.service_types.includes(nlu.service_type));
  }

  const userLat = contextLat ?? nlu.location.resolved?.lat ?? 33.6651;
  const userLng = contextLng ?? nlu.location.resolved?.lng ?? 72.9648;

  // ── Dynamic weight adjustment when user specifies a budget ─────
  // Double the price weight so budget-friendly providers rank higher
  const dynamicWeights = { ...WEIGHTS };
  if (nlu.constraints.max_budget) {
    const priceBoost = dynamicWeights.price; // 0.09
    dynamicWeights.price = priceBoost * 2;   // 0.18
    // Redistribute the extra weight from lower-priority factors
    dynamicWeights.review_recency -= priceBoost * 0.4;
    dynamicWeights.user_preference -= priceBoost * 0.3;
    dynamicWeights.risk_score -= priceBoost * 0.3;
  }

  // ── Score every candidate on all 11 factors ─────────────────
  const ranked: RankedProvider[] = candidates.map(provider => {
    const distResult   = scoreDistance(provider, userLat, userLng);
    const availResult  = scoreAvailability(provider, nlu);
    const ratingResult = scoreRating(provider);
    const recencyResult= scoreReviewRecency(provider);
    const onTimeResult = scoreOnTime(provider);
    const specResult   = scoreSpecialization(provider, nlu);
    const priceResult  = scorePrice(provider, nlu);
    const capResult    = scoreCapacity(provider);
    const cancelResult = scoreCancellation(provider);
    const prefResult   = scoreUserPreference(provider, nlu);
    const riskResult   = scoreRisk(provider);

    const breakdown: MatchingFactorScore = {
      distance:        Math.round(distResult.score * 10) / 10,
      availability:    Math.round(availResult.score * 10) / 10,
      rating:          Math.round(ratingResult.score * 10) / 10,
      review_recency:  Math.round(recencyResult.score * 10) / 10,
      on_time:         Math.round(onTimeResult.score * 10) / 10,
      specialization:  Math.round(specResult.score * 10) / 10,
      price:           Math.round(priceResult.score * 10) / 10,
      capacity:        Math.round(capResult.score * 10) / 10,
      cancellation:    Math.round(cancelResult.score * 10) / 10,
      user_preference: Math.round(prefResult.score * 10) / 10,
      risk_score:      Math.round(riskResult.score * 10) / 10,
    };

    const factor_labels: Record<keyof MatchingFactorScore, string> = {
      distance:        distResult.label,
      availability:    availResult.label,
      rating:          ratingResult.label,
      review_recency:  recencyResult.label,
      on_time:         onTimeResult.label,
      specialization:  specResult.label,
      price:           priceResult.label,
      capacity:        capResult.label,
      cancellation:    cancelResult.label,
      user_preference: prefResult.label,
      risk_score:      riskResult.label,
    };

    // Weighted total (each factor: 0-10, weight sums to ~1.0 → total max ~100)
    const total = Object.entries(dynamicWeights).reduce((sum, [key, weight]) => {
      return sum + (breakdown[key as keyof MatchingFactorScore]) * weight * 10;
    }, 0);

    return {
      provider,
      total_score: Math.round(total * 10) / 10,
      breakdown,
      factor_labels,
      estimated_travel_minutes: Math.round(distResult.km * 3.5),
      estimated_distance_km: distResult.km,
      risk_flags: riskResult.flags,
    };
  }).sort((a, b) => b.total_score - a.total_score);

  // ── Hard-cap budget filter ──────────────────────────────────────
  // If user specified a max budget, remove providers whose base rate
  // clearly exceeds it. We allow 20% tolerance since pricing agent
  // applies complexity/urgency multipliers later.
  let filteredRanked = ranked;
  if (nlu.constraints.max_budget) {
    const budget = nlu.constraints.max_budget;
    filteredRanked = ranked.filter(r => {
      const rates = Object.values(r.provider.rate_card);
      if (rates.length === 0) return true; // no rate info → keep
      const minRate = Math.min(...rates);
      return minRate <= budget * 1.3; // 30% tolerance for multipliers
    });
    // If all providers got filtered out, keep the top 2 cheapest anyway
    if (filteredRanked.length === 0) {
      filteredRanked = ranked
        .sort((a, b) => {
          const aRates = Object.values(a.provider.rate_card);
          const bRates = Object.values(b.provider.rate_card);
          const aMin = aRates.length > 0 ? Math.min(...aRates) : Infinity;
          const bMin = bRates.length > 0 ? Math.min(...bRates) : Infinity;
          return aMin - bMin;
        })
        .slice(0, 2);
    }
  }

  // ── Gemini reasoning over full factor breakdown ─────────────
  const top = filteredRanked[0];
  const runner = filteredRanked[1];
  let rationale = 'No providers available to compare.';

  if (top) {
    if (isGeminiAvailable() && runner) {
      const buildSummary = (r: RankedProvider) =>
        `${r.provider.name} [Score: ${r.total_score}/100]
  • Distance: ${r.breakdown.distance}/10 — ${r.factor_labels.distance}
  • Availability: ${r.breakdown.availability}/10 — ${r.factor_labels.availability}
  • Rating: ${r.breakdown.rating}/10 — ${r.factor_labels.rating}
  • Review Recency: ${r.breakdown.review_recency}/10 — ${r.factor_labels.review_recency}
  • On-Time Reliability: ${r.breakdown.on_time}/10 — ${r.factor_labels.on_time}
  • Specialization: ${r.breakdown.specialization}/10 — ${r.factor_labels.specialization}
  • Price: ${r.breakdown.price}/10 — ${r.factor_labels.price}
  • Capacity: ${r.breakdown.capacity}/10 — ${r.factor_labels.capacity}
  • Cancellation Rate: ${r.breakdown.cancellation}/10 — ${r.factor_labels.cancellation}
  • User Preference: ${r.breakdown.user_preference}/10 — ${r.factor_labels.user_preference}
  • Risk Score: ${r.breakdown.risk_score}/10 — ${r.factor_labels.risk_score}
  • Risk Flags: ${r.risk_flags.length > 0 ? r.risk_flags.join(', ') : 'None'}`;

      const prompt = `You are UstaJi's AI Matching Agent. A user has requested: ${nlu.service_type.replace(/_/g, ' ')} in ${city}.

Here are the top two candidates ranked by our 11-factor scoring system:

TOP RECOMMENDATION:
${buildSummary(top)}

RUNNER-UP:
${buildSummary(runner)}

Write a clear, transparent 3-4 sentence explanation (Urdu/English mixed is fine) of:
1. Why the top provider was selected
2. Which specific factors gave them the advantage  
3. Any risk flags the user should know about
4. Whether the runner-up is worth considering

Be honest, specific, and use actual numbers. Do NOT use markdown or bullet points. Write in flowing sentences.`;

      try {
        rationale = await callGemini(prompt);
      } catch {
        rationale = buildFallbackRationale(top, runner);
      }
    } else if (runner) {
      rationale = buildFallbackRationale(top, runner);
    } else {
      rationale = `${top.provider.name} is the only available provider for ${nlu.service_type} in ${city} (score: ${top.total_score}/100).`;
    }

    // Attach rationale to top provider
    filteredRanked[0] = { ...filteredRanked[0], gemini_rationale: rationale };
  }

  const trace: AgentTrace = {
    id: uuid(),
    agent: 'MatchingAgent',
    step: 'provider_ranking',
    observation: `Evaluated ${candidates.length} providers for ${nlu.service_type} near ${city} (${userLat.toFixed(4)},${userLng.toFixed(4)})${nlu.constraints.max_budget ? ` [Budget: PKR ${nlu.constraints.max_budget}]` : ''}`,
    reasoning: {
      factors_used: Object.keys(WEIGHTS),
      weights: dynamicWeights,
      candidates_evaluated: candidates.length,
      budget_filtered: nlu.constraints.max_budget ? `${candidates.length} → ${filteredRanked.length}` : 'none',
      max_budget: nlu.constraints.max_budget || null,
      top_3: filteredRanked.slice(0, 3).map(r => ({
        name: r.provider.name,
        score: r.total_score,
        breakdown: r.breakdown,
        factor_labels: r.factor_labels,
        risks: r.risk_flags,
      })),
      gemini_rationale: rationale,
    },
    decision: rationale,
    confidence: top ? Math.min(0.99, top.total_score / 100 + 0.05) : 0.1,
    action: filteredRanked.length > 0 ? 'present_providers' : 'no_provider_available',
    timestamp: new Date().toISOString(),
  };

  return { ranked: filteredRanked, trace };
}

// ── Fallback rationale (no Gemini) ────────────────────────────
function buildFallbackRationale(top: RankedProvider, runner: RankedProvider): string {
  const advantages: string[] = [];
  if (top.breakdown.distance > runner.breakdown.distance)
    advantages.push(`closer distance (${top.estimated_distance_km}km vs ${runner.estimated_distance_km}km)`);
  if (top.breakdown.rating > runner.breakdown.rating)
    advantages.push(`higher rating (${top.provider.stats.avg_rating}★ vs ${runner.provider.stats.avg_rating}★)`);
  if (top.breakdown.on_time > runner.breakdown.on_time)
    advantages.push(`better reliability (${top.provider.stats.on_time_percentage}% vs ${runner.provider.stats.on_time_percentage}% on-time)`);
  if (top.breakdown.specialization > runner.breakdown.specialization)
    advantages.push('stronger skill specialization');
  if (top.breakdown.cancellation > runner.breakdown.cancellation)
    advantages.push(`lower cancellation rate (${top.provider.stats.cancellation_rate}% vs ${runner.provider.stats.cancellation_rate}%)`);
  if (top.risk_flags.length < runner.risk_flags.length)
    advantages.push('fewer risk flags');

  const riskNote = top.risk_flags.length > 0 ? ` Note: ${top.risk_flags.join(', ')}.` : '';
  return `${top.provider.name} (${top.total_score}/100) selected over ${runner.provider.name} (${runner.total_score}/100) due to: ${advantages.join(', ') || 'overall higher composite score'}.${riskNote}`;
}
