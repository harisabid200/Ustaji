import { Platform } from 'react-native';
import { AgentTrace, RankedProvider, SchedulingResult } from '../types/chat';

// expo-constants — loaded safely (may not have types in all Expo SDK versions)
let Constants: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Constants = require('expo-constants').default;
} catch { /* Not available in web/standalone builds */ }

/**
 * Resolve the API base URL using a 3-tier priority system:
 *
 * 1. EXPO_PUBLIC_API_URL (set in .env / EAS build variables)
 *    → Used for PRODUCTION. Baked into APK at build time.
 *    → Example:  EXPO_PUBLIC_API_URL=https://ustaji-api-xxxxx.run.app/api
 *
 * 2. Expo Metro host (LAN IP auto-detected during `expo start`)
 *    → Used for LOCAL DEVELOPMENT over WiFi. No hardcoded IPs needed.
 *    → The phone and PC are on the same network, Expo knows the PC's IP.
 *
 * 3. Simulator fallback
 *    → iOS Simulator runs on the Mac, which can reach the Mac's localhost.
 *    → Android Emulator uses 10.0.2.2 to reach the host machine.
 */
function getBaseUrl(): string {
  // ── Tier 1: Production URL from environment variable ──────────────────────
  // EXPO_PUBLIC_ prefix is Expo's convention for variables exposed to the JS bundle.
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  // ── Tier 2: LAN IP auto-detection (Expo Go development) ──────────────────
  // expo-constants exposes the Metro bundler host in two places
  // depending on SDK version — check both.
  const expoHost =
    Constants.expoConfig?.hostUri ??          // SDK 46+
    (Constants as any).manifest?.debuggerHost ?? // SDK <46
    (Constants as any).manifest2?.extra?.expoClient?.hostUri; // EAS dev

  if (expoHost) {
    // hostUri looks like "192.168.x.x:8081" — strip the Metro port, use API port
    const ip = expoHost.split(':')[0];
    return `http://${ip}:3000/api`;
  }

  // ── Tier 3: Simulator fallback ────────────────────────────────────────────
  if (Platform.OS === 'android') {
    // 10.0.2.2 is the Android Emulator's alias for the host machine's localhost
    return 'http://10.0.2.2:3000/api';
  }

  // iOS Simulator shares the host machine's network stack
  return 'http://localhost:3000/api';
}

export const BASE_URL = getBaseUrl();

interface ChatApiResponse {
  reply: string;
  message?: string;
  stage: string;
  reasoning_traces: AgentTrace[];
  traces?: AgentTrace[];
  providers?: any[];
  price_estimate?: any;
  pricing?: any;
  scheduling?: SchedulingResult;
  booking?: Record<string, unknown>;
  session_id: string;
  confidence?: number;
  actions?: string[];
}

class ApiService {
  private sessionId: string | null = null;
  private baseUrl: string;

  // Default fetch timeout (ms). Chat gets a longer timeout (Gemini can be slow).
  private readonly DEFAULT_TIMEOUT = 10_000;
  private readonly CHAT_TIMEOUT = 60_000;

  constructor(url: string) {
    this.baseUrl = url;
  }

  /** Change the base URL at runtime (e.g. after reading remote config). */
  setBaseUrl(url: string) { this.baseUrl = url; }
  getBaseUrl() { return this.baseUrl; }

  setSessionId(id: string) { this.sessionId = id; }
  resetSession() { this.sessionId = null; }

  // ─── Internal helper ─────────────────────────────────────────
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = this.DEFAULT_TIMEOUT,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Chat ─────────────────────────────────────────────────────
  async sendMessage(message: string, userId: string = 'demo-user'): Promise<ChatApiResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user_id: userId, session_id: this.sessionId || undefined }),
      },
      this.CHAT_TIMEOUT,
    );
    if (!response.ok) throw new Error(`API error ${response.status}: ${await response.text()}`);
    const data: ChatApiResponse = await response.json();
    if (data.session_id) this.sessionId = data.session_id;
    return data;
  }

  async checkHealth(): Promise<boolean> {
    // Try up to 2 times — first attempt often hits Cloud Run cold start
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.fetchWithTimeout(`${this.baseUrl}/health`, {}, 10_000);
        if (response.ok) return true;
      } catch { /* timeout or network error — retry */ }
      if (attempt === 0) await new Promise(r => setTimeout(r, 1500)); // brief pause before retry
    }
    return false;
  }

  // ─── Providers ────────────────────────────────────────────────
  async getProviders(): Promise<any[]> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/providers`);
    if (!response.ok) throw new Error('Failed to fetch providers');
    const data = await response.json();
    return data.providers || data || [];
  }

  async getProviderById(id: string): Promise<any> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/providers/${id}`);
    if (!response.ok) throw new Error('Failed to fetch provider');
    return response.json();
  }

  async registerProvider(providerData: any): Promise<void> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/provider/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerData),
      },
    );
    if (!response.ok) throw new Error('Failed to register provider');
  }

  // ─── Categories ───────────────────────────────────────────────
  async getCategories(): Promise<any[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/categories`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.categories || data || [];
    } catch { return []; }
  }

  // ─── Bookings ─────────────────────────────────────────────────
  async getBookings(userId: string = 'demo-user'): Promise<any[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/bookings?user_id=${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.bookings || data || [];
    } catch { return []; }
  }

  async getBooking(id: string): Promise<any> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/bookings/${id}`);
    if (!response.ok) throw new Error('Failed to fetch booking');
    return response.json();
  }

  async cancelBooking(id: string): Promise<void> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/bookings/${id}/cancel`,
      { method: 'POST' },
    );
    if (!response.ok) throw new Error('Failed to cancel booking');
  }

  async reportDelay(bookingId: string, delayMinutes: number, reason: string): Promise<any> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/bookings/${bookingId}/delay`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delay_minutes: delayMinutes, reason }),
      },
    );
    if (!response.ok) throw new Error('Failed to report delay');
    return response.json();
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<void> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/bookings/${bookingId}/status`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
    );
    if (!response.ok) throw new Error('Failed to update status');
  }

  // ─── Ratings ──────────────────────────────────────────────────
  async submitRating(bookingId: string, payload: { rating: number; review: string; category_ratings?: Record<string, number> }): Promise<void> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/bookings/${bookingId}/rate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error('Failed to submit rating');
  }

  // ─── Provider APIs ────────────────────────────────────────────
  async getProviderDashboard(providerId: string): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/provider/dashboard?provider_id=${providerId}`);
      if (!response.ok) return null;
      return response.json();
    } catch { return null; }
  }

  async getOpportunities(providerId: string): Promise<any[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/provider/opportunities?provider_id=${providerId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.opportunities || [];
    } catch { return []; }
  }

  async respondToOpportunity(opportunityId: string, accept: boolean): Promise<void> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/provider/opportunities/${opportunityId}/respond`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: accept }),
      },
    );
    if (!response.ok) throw new Error('Failed to respond to opportunity');
  }
}

export const apiService = new ApiService(BASE_URL);
export type { ChatApiResponse };
