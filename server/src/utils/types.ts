// ============================================================
// UstaJi — Core Type Definitions
// All shared types for agents, API, and data layer
// ============================================================

// ── Service Types ──────────────────────────────────────────

export type ServiceCategory =
  | 'ac_repair'
  | 'ac_installation'
  | 'plumbing'
  | 'electrical'
  | 'carpentry'
  | 'painting'
  | 'cleaning'
  | 'tutoring'
  | 'beauty'
  | 'driving'
  | 'mechanic'
  | 'home_appliance';

export type JobComplexity = 'basic' | 'intermediate' | 'complex';

export interface ComplexityClassification {
  level: JobComplexity;
  confidence: number;              // 0-1
  reasoning: string;               // Why this complexity level
  matched_skills: string[];        // Provider skills that directly match the job
  missing_skills: string[];        // Skills the job needs that provider may lack
  required_tools: string[];        // Tools/parts likely needed
  estimated_duration_minutes: number; // Expected job time
  provider_suitable: boolean;      // Is the top provider qualified?
  upsell_opportunity?: string;     // If job is more complex than user described
}

export type Urgency = 'emergency' | 'today' | 'tomorrow' | 'this_week' | 'flexible';

export type BudgetSensitivity = 'low' | 'medium' | 'high';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

// ── Location ────────────────────────────────────────────────

export interface GeoLocation {
  lat: number;
  lng: number;
  formatted_address?: string;
  area?: string;
  city?: string;
}

// ── NLU Result ──────────────────────────────────────────────

export interface NLUResult {
  service_type: ServiceCategory;
  service_subtype?: string;
  location: {
    raw: string;
    resolved?: GeoLocation;
    confidence: number;
  };
  time_preference: {
    urgency: Urgency;
    preferred_slot?: 'morning' | 'afternoon' | 'evening' | 'night';
    specific_time?: string;
    specific_date?: string;
  };
  constraints: {
    budget_sensitivity: BudgetSensitivity;
    max_budget?: number;
    gender_preference?: 'male' | 'female' | 'any';
    language_preference?: string;
  };
  issue_severity: IssueSeverity;
  issue_description?: string;
  confidence_score: number;
  clarification_needed: string[];
  detected_language: 'en' | 'ur' | 'roman_ur' | 'mixed';
  raw_input: string;
}

// ── Provider ────────────────────────────────────────────────

export interface ProviderReview {
  id: string;
  user_name: string;
  rating: number;
  text: string;
  service_category: ServiceCategory;
  sentiment_score: number;
  created_at: string;
}

export interface Provider {
  id: string;
  name: string;
  phone: string;
  avatar_url?: string;
  location: GeoLocation;
  service_types: ServiceCategory[];
  skills: string[];
  certifications: string[];
  experience_years: number;
  availability: Record<string, string[]>;
  rate_card: Record<string, number>;
  stats: {
    total_jobs: number;
    completed_jobs: number;
    on_time_percentage: number;
    cancellation_rate: number;
    avg_rating: number;
    rating_count: number;
  };
  reviews: ProviderReview[];
  max_jobs_per_day: number;
  languages: string[];
  gender: 'male' | 'female';
  verified: boolean;
  bio?: string;
}

// ── Matching ────────────────────────────────────────────────

export interface MatchingFactorScore {
  // Factor 1 — Distance / Travel Time
  distance: number;
  // Factor 2 — Availability (day + time slot match)
  availability: number;
  // Factor 3 — Rating (time-weighted)
  rating: number;
  // Factor 4 — Review Recency
  review_recency: number;
  // Factor 5 — Reliability / On-Time Score
  on_time: number;
  // Factor 6 — Skill Specialization
  specialization: number;
  // Factor 7 — Price Competitiveness
  price: number;
  // Factor 8 — Capacity (remaining slots today)
  capacity: number;
  // Factor 9 — Cancellation Rate
  cancellation: number;
  // Factor 10 — User Preference (gender, language)
  user_preference: number;
  // Factor 11 — Risk Score (composite penalty)
  risk_score: number;
}

export interface RankedProvider {
  provider: Provider;
  total_score: number;
  breakdown: MatchingFactorScore;
  factor_labels: Record<keyof MatchingFactorScore, string>; // human-readable reason per factor
  estimated_travel_minutes: number;
  estimated_distance_km: number;
  risk_flags: string[];
  gemini_rationale?: string; // AI-generated explanation
}

// ── Pricing ─────────────────────────────────────────────────

export interface PriceBreakdown {
  base_rate: number;
  complexity_multiplier: number;
  urgency_factor: number;
  distance_cost: number;
  material_estimate: number;
  loyalty_discount: number;
  surge_premium: number;
  total: number;
  currency: 'PKR';
}

export interface PricingResult {
  primary_quote: PriceBreakdown;
  budget_alternative?: PriceBreakdown & { provider_id: string; provider_name: string };
  fairness_score: number;          // 0-1: how fair is the price vs market
  reasoning: string;               // Human-readable breakdown explanation
  provider_earnings?: number;      // What the provider earns (after platform cut)
  demand_level?: 'low' | 'medium' | 'high'; // Current demand signal
  complexity_used?: JobComplexity; // Which complexity level was applied
}

// ── Scheduling ──────────────────────────────────────────────

export interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  provider_id: string;
  provider_name: string;
}

export interface SchedulingResult {
  primary_slot: TimeSlot;
  alternatives: TimeSlot[];
  travel_buffer_minutes: number;
  conflict_detected: boolean;
  waitlist_position?: number;
  auto_reschedule_reason?: string;
}

// ── Booking ─────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'provider_en_route'
  | 'in_progress'
  | 'delayed'           // Provider running late — user notified
  | 'completed'
  | 'rated'
  | 'cancelled'
  | 'rescheduled'
  | 'disputed';

export interface BookingDelay {
  delay_minutes: number;          // How much extra time needed
  reason: string;                 // Provider's reason (free text)
  reported_at: string;            // When provider reported it
  original_scheduled_time: string;// Original time before delay
  new_scheduled_time: string;     // Recalculated expected arrival
  user_notified: boolean;
}

export interface Booking {
  id: string;
  user_id: string;
  provider_id: string;
  provider_name: string;
  service_type: ServiceCategory;
  service_subtype?: string;
  job_complexity: JobComplexity;
  status: BookingStatus;
  scheduled_time: string;         // Current scheduled time (updated on delay)
  actual_start?: string;
  actual_end?: string;
  location: GeoLocation;
  price: {
    quoted: number;
    final?: number;
    breakdown: PriceBreakdown;
    currency: 'PKR';
  };
  delay?: BookingDelay;           // Set when provider reports running late
  reasoning_traces: AgentTrace[];
  feedback?: {
    rating: number;
    review: string;
    sentiment_score: number;
  };
  dispute?: Dispute;
  notifications: NotificationRecord[];
  created_at: string;
  updated_at: string;
}

// ── Dispute ─────────────────────────────────────────────────

export type DisputeType =
  | 'no_show'
  | 'price_disagreement'
  | 'quality_complaint'
  | 'service_overrun'
  | 'safety_concern'
  | 'cancellation';

export type DisputeStatus =
  | 'open'
  | 'investigating'
  | 'resolved'
  | 'escalated'
  | 'closed';

export interface Dispute {
  id: string;
  booking_id: string;
  type: DisputeType;
  status: DisputeStatus;
  description: string;
  user_evidence?: string;
  provider_response?: string;
  resolution?: {
    action: string;
    refund_amount?: number;
    rating_adjustment?: number;
    provider_penalty?: string;
  };
  escalation_level: number;
  agent_reasoning: string;
  created_at: string;
  resolved_at?: string;
}

// ── Agent Traces ────────────────────────────────────────────

export interface AgentTrace {
  id: string;
  agent: string;
  step: string;
  observation: string;
  reasoning: Record<string, any>;
  decision: string;
  confidence: number;
  action: string;
  timestamp: string;
}

// ── Chat / Session ──────────────────────────────────────────

export type ConversationStage =
  | 'greeting'
  | 'understanding'
  | 'clarifying'
  | 'matching'
  | 'pricing'
  | 'scheduling'
  | 'confirming'
  | 'booked'
  | 'tracking'
  | 'feedback'
  | 'dispute';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    stage?: ConversationStage;
    nlu_result?: NLUResult;
    providers?: RankedProvider[];
    pricing?: PricingResult;
    scheduling?: SchedulingResult;
    booking?: Booking;
    traces?: AgentTrace[];
    actions?: string[];
    confidence?: number;
  };
}

export interface ChatSession {
  id: string;
  user_id: string;
  user_location?: GeoLocation;
  messages: ChatMessage[];
  current_stage: ConversationStage;
  nlu_context?: NLUResult;
  complexity?: ComplexityClassification;   // From ComplexityAgent
  selected_provider?: RankedProvider;
  pricing_result?: PricingResult;
  scheduling_result?: SchedulingResult;
  booking?: Booking;
  created_at: string;
  updated_at: string;
}

// ── Notification ────────────────────────────────────────────

export interface NotificationRecord {
  id: string;
  type: 'sms' | 'whatsapp' | 'push' | 'email';
  recipient: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed';
  timestamp: string;
}

// ── API Types ───────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  session_id?: string;
  user_id: string;
  user_location?: GeoLocation;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  stage: ConversationStage;
  nlu_result?: NLUResult;
  reasoning_traces: AgentTrace[];
  providers?: RankedProvider[];
  price_estimate?: PricingResult;
  scheduling?: SchedulingResult;
  booking?: Booking;
  actions: string[];
  confidence: number;
}
