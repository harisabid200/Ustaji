import { NLUResult, RankedProvider, PricingResult, PriceBreakdown, AgentTrace, ComplexityClassification, JobComplexity } from '../utils/types';
import { quickClassifyComplexity } from './complexity';
import { v4 as uuid } from 'uuid';

const COMPLEXITY_MULTIPLIERS: Record<JobComplexity, number> = {
  basic: 1.0,
  intermediate: 1.35,
  complex: 1.85,
};

const URGENCY_FACTORS: Record<string, number> = {
  emergency: 1.6,
  today:     1.2,
  tomorrow:  1.0,
  this_week: 0.95,
  flexible:  0.90,
};

const DISTANCE_RATE_PER_KM = 25; // PKR per km travel cost

// Market average rates by service (PKR)
const MARKET_RATES: Record<string, number> = {
  ac_repair:      2000, ac_installation: 5000,
  plumbing:       1500, electrical:       1800,
  carpentry:      2500, painting:         4000,
  cleaning:       2500, tutoring:         1500,
  beauty:         2000, driving:          1000,
  mechanic:       2000, home_appliance:   1500,
};

// Surge: time-of-day × day premium
function calculateSurge(urgency: string, bookingCount = 0): number {
  const hour = new Date().getHours();
  const isPeakHour = (hour >= 9 && hour <= 11) || (hour >= 16 && hour <= 19);
  const isWeekend = [5, 6].includes(new Date().getDay()); // Fri/Sat in Pakistan

  let surge = 0;
  if (urgency === 'emergency') surge += 300;
  if (isPeakHour) surge += 150;
  if (isWeekend && urgency !== 'flexible') surge += 100;
  if (bookingCount > 3) surge += 200; // High demand for this provider
  return surge;
}

// Loyalty discount based on user's booking history
function calculateLoyaltyDiscount(baseRate: number, userBookingCount: number): number {
  if (userBookingCount >= 10) return Math.round(baseRate * 0.10); // 10% off VIP
  if (userBookingCount >= 5)  return Math.round(baseRate * 0.07); // 7% off loyal
  if (userBookingCount >= 3)  return Math.round(baseRate * 0.05); // 5% off repeat
  return 0; // First/second time — no discount
}

function buildPriceBreakdown(
  provider: RankedProvider,
  nlu: NLUResult,
  complexity: ComplexityClassification | null,
  userBookingCount: number,
): PriceBreakdown {
  const level: JobComplexity = complexity?.level || quickClassifyComplexity(nlu);
  const serviceKey = nlu.service_type;
  const market = MARKET_RATES[serviceKey] || 2000;

  // Base rate: provider's rate card → fall back to market avg
  const rateKeys = Object.keys(provider.provider.rate_card);
  const matchKey = rateKeys.find(k =>
    k.includes(nlu.service_type.replace('_', '')) ||
    k.includes(nlu.service_type.split('_')[0])
  ) || rateKeys[0];
  const baseRate = provider.provider.rate_card[matchKey] || market;

  const complexityMult = COMPLEXITY_MULTIPLIERS[level];
  const urgencyFact = URGENCY_FACTORS[nlu.time_preference.urgency] || 1.0;
  const distanceCost = Math.round(provider.estimated_distance_km * DISTANCE_RATE_PER_KM);

  // Materials: varies by complexity and service
  const materialEstimate = level === 'complex' ? 800
    : level === 'intermediate' ? 300
    : 0;

  const surgePremium = calculateSurge(nlu.time_preference.urgency);
  const loyaltyDiscount = calculateLoyaltyDiscount(baseRate, userBookingCount);

  const total = Math.round(
    baseRate * complexityMult * urgencyFact
    + distanceCost
    + materialEstimate
    + surgePremium
    - loyaltyDiscount
  );

  return {
    base_rate: baseRate,
    complexity_multiplier: complexityMult,
    urgency_factor: urgencyFact,
    distance_cost: distanceCost,
    material_estimate: materialEstimate,
    loyalty_discount: loyaltyDiscount,
    surge_premium: surgePremium,
    total,
    currency: 'PKR',
  };
}

export function runPricingAgent(
  nlu: NLUResult,
  rankedProviders: RankedProvider[],
  complexity: ComplexityClassification | null = null,
  userBookingCount = 0,
): { result: PricingResult; trace: AgentTrace } {

  if (rankedProviders.length === 0) {
    return {
      result: {
        primary_quote: { base_rate: 0, complexity_multiplier: 1, urgency_factor: 1, distance_cost: 0, material_estimate: 0, loyalty_discount: 0, surge_premium: 0, total: 0, currency: 'PKR' },
        fairness_score: 0, reasoning: 'No providers available',
      },
      trace: {
        id: uuid(), agent: 'PricingAgent', step: 'no_providers',
        observation: 'No providers to price', reasoning: {}, decision: 'Cannot price without providers',
        confidence: 0, action: 'skip', timestamp: new Date().toISOString(),
      },
    };
  }

  const primary = rankedProviders[0];
  const level: JobComplexity = complexity?.level || quickClassifyComplexity(nlu);
  const primaryQuote = buildPriceBreakdown(primary, nlu, complexity, userBookingCount);

  // Budget alternative: cheapest option from remaining providers
  let budgetAlt: PricingResult['budget_alternative'] = undefined;
  if (nlu.constraints.budget_sensitivity === 'high' && rankedProviders.length > 1) {
    const cheapest = rankedProviders.slice(1).reduce((min, p) => {
      const q = buildPriceBreakdown(p, nlu, complexity, userBookingCount);
      return q.total < buildPriceBreakdown(min, nlu, complexity, userBookingCount).total ? p : min;
    }, rankedProviders[1]);
    const cheapQuote = buildPriceBreakdown(cheapest, nlu, complexity, userBookingCount);
    if (cheapQuote.total < primaryQuote.total) {
      budgetAlt = { ...cheapQuote, provider_id: cheapest.provider.id, provider_name: cheapest.provider.name };
    }
  }

  // Fairness: how close is the price to market average?
  const market = MARKET_RATES[nlu.service_type] || 2000;
  const fairnessScore = Math.max(0.3, Math.min(1.0, 1 - Math.abs(primaryQuote.total - market) / market * 0.5));

  // Provider's estimated earnings (platform takes 10%)
  const providerEarnings = Math.round(primaryQuote.total * 0.9);

  const reasonParts = [
    `${level} complexity (×${primaryQuote.complexity_multiplier})`,
    `${nlu.time_preference.urgency} urgency (×${primaryQuote.urgency_factor})`,
    `${primary.estimated_distance_km}km travel (+Rs.${primaryQuote.distance_cost})`,
    primaryQuote.surge_premium > 0 ? `surge +Rs.${primaryQuote.surge_premium}` : '',
    primaryQuote.loyalty_discount > 0 ? `loyalty -Rs.${primaryQuote.loyalty_discount}` : '',
    primaryQuote.material_estimate > 0 ? `materials +Rs.${primaryQuote.material_estimate}` : '',
  ].filter(Boolean).join(', ');

  const result: PricingResult = {
    primary_quote: primaryQuote,
    budget_alternative: budgetAlt,
    fairness_score: Math.round(fairnessScore * 100) / 100,
    reasoning: reasonParts,
    provider_earnings: providerEarnings,
    demand_level: primaryQuote.surge_premium > 200 ? 'high' : primaryQuote.surge_premium > 0 ? 'medium' : 'low',
  } as PricingResult & { provider_earnings: number; demand_level: string };

  const trace: AgentTrace = {
    id: uuid(), agent: 'PricingAgent', step: 'price_calculation',
    observation: `Pricing ${nlu.service_type} [${level}] with ${primary.provider.name}`,
    reasoning: {
      complexity: level,
      complexity_source: complexity ? 'gemini_agent' : 'rule_fallback',
      base_rate: primaryQuote.base_rate,
      complexity_multiplier: primaryQuote.complexity_multiplier,
      urgency_factor: primaryQuote.urgency_factor,
      distance_cost: primaryQuote.distance_cost,
      surge_premium: primaryQuote.surge_premium,
      loyalty_discount: primaryQuote.loyalty_discount,
      material_estimate: primaryQuote.material_estimate,
      total: primaryQuote.total,
      provider_earnings: providerEarnings,
      budget_sensitivity: nlu.constraints.budget_sensitivity,
      fairness_score: fairnessScore,
      has_budget_alternative: !!budgetAlt,
      user_loyalty_bookings: userBookingCount,
    },
    decision: `Quoted Rs.${primaryQuote.total}${budgetAlt ? ` | Budget option: Rs.${budgetAlt.total} with ${budgetAlt.provider_name}` : ''} | Provider earns Rs.${providerEarnings}`,
    confidence: 0.85,
    action: 'present_pricing',
    timestamp: new Date().toISOString(),
  };

  return { result, trace };
}
