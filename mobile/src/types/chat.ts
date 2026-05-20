// Chat UI types — mirrors server types but lightweight for mobile

export type MessageRole = 'user' | 'agent' | 'system';

// Extended to include all agent names from server (both formats)
export type AgentName =
  | 'NLU Agent' | 'Matching Agent' | 'Pricing Agent' | 'Scheduling Agent' | 'Supervisor'
  | 'NLUAgent' | 'MatchingAgent' | 'PricingAgent' | 'SchedulingAgent' | 'ComplexityAgent'
  | 'BookingAgent' | 'DisputeAgent';

export interface AgentTrace {
  agent: AgentName | string;  // Allow any string for future agents
  // Server sends these fields (corrected from thought/action/result):
  observation?: string;        // What the agent observed
  decision?: string;           // What the agent decided
  reasoning?: Record<string, any> | string; // Detailed reasoning
  step?: string;               // Which step in the pipeline
  confidence?: number;         // 0-1 confidence score
  // Legacy fields (kept for backward compat)
  thought?: string;
  action?: string;
  result?: string;
  duration_ms?: number;
  timestamp?: string;
}

export interface SchedulingSlot {
  date: string;
  start_time: string;
  end_time: string;
  provider_id: string;
  provider_name: string;
}

export interface SchedulingResult {
  primary_slot: SchedulingSlot;
  alternatives: SchedulingSlot[];
  travel_buffer_minutes: number;
  conflict_detected: boolean;
  waitlist_position?: number;
  auto_reschedule_reason?: string;
}

export interface RankedProvider {
  id: string;
  name: string;
  service: string;
  rating: number;
  reviews: number;
  base_rate: number;
  distance_km?: number;
  match_score: number;
  available: boolean;
  location: string;
}

export interface PricingResult {
  base_price: number;
  final_price: number;
  currency: string;
  // Server uses primary_quote (richer structure)
  primary_quote?: {
    base_rate: number;
    complexity_multiplier: number;
    urgency_factor: number;
    distance_cost: number;
    material_estimate?: number;
    surge_fee?: number;
    loyalty_discount?: number;
    total: number;
  };
  // Legacy breakdown
  breakdown: {
    base: number;
    complexity_multiplier: number;
    urgency_factor: number;
    distance_charge?: number;
  };
  alternative?: {
    provider_name: string;
    price: number;
  };
  budget_alternative?: {
    provider_name: string;
    total: number;
  };
  demand_level?: 'low' | 'medium' | 'high';
  provider_earnings?: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  traces?: AgentTrace[];
  providers?: RankedProvider[];
  pricing?: PricingResult;
  scheduling?: SchedulingResult;
  stage?: string;
  isLoading?: boolean;
}

export interface ChatApiResponse {
  reply?: string;
  message?: string;
  session_id?: string;
  stage?: string;
  reasoning_traces?: AgentTrace[];
  traces?: AgentTrace[];
  providers?: RankedProvider[];
  price_estimate?: PricingResult;
  scheduling?: SchedulingResult;
  actions?: string[];
  confidence?: number;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  stage: string;
}
