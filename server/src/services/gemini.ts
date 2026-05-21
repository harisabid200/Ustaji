import { GoogleGenerativeAI, GenerativeModel, Tool } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

// ── Circuit Breaker state ─────────────────────────────────────
let failureCount = 0;
let circuitOpenUntil = 0;
const FAILURE_THRESHOLD = 5;      // open circuit after 5 consecutive failures
const CIRCUIT_OPEN_MS   = 30_000; // stay open for 30 seconds

function isCircuitOpen(): boolean {
  if (circuitOpenUntil && Date.now() < circuitOpenUntil) return true;
  if (circuitOpenUntil && Date.now() >= circuitOpenUntil) {
    // Half-open: allow one probe attempt
    circuitOpenUntil = 0;
    failureCount = 0;
  }
  return false;
}

function recordSuccess(): void {
  failureCount = 0;
  circuitOpenUntil = 0;
}

function recordFailure(): void {
  failureCount++;
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
    console.error(`❌ Gemini circuit breaker OPEN — will retry after ${CIRCUIT_OPEN_MS / 1000}s`);
  }
}

// ── Initialization ────────────────────────────────────────────
export function initGemini(): void {
  if (!API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set. AI features will use fallback responses.');
    return;
  }
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',   // Free tier: 15 RPM, 1500 RPD, 1M TPM (vs 2.5-flash: 10 RPM, 500 RPD)
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });
    console.log('✅ Gemini initialized with gemini-1.5-flash');
  } catch (e: any) {
    console.error('❌ Gemini init failed:', e.message);
  }
}

// ── Internal: call with timeout ────────────────────────────────
const GEMINI_TIMEOUT_MS = 30_000; // 30s — generous for reasoning tasks

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms (${label})`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

// ── Internal: exponential backoff retry ───────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      recordSuccess();
      return result;
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err.message?.includes('429') ||   // rate limited
        err.message?.includes('503') ||   // service unavailable
        err.message?.includes('timeout'); // our timeout

      if (!isRetryable || attempt === maxAttempts) break;

      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000); // 1s, 2s, 4s → max 8s
      console.warn(`⚠️  Gemini [${label}] attempt ${attempt} failed — retrying in ${backoffMs}ms: ${err.message}`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }

  recordFailure();
  throw lastError;
}

// ── Public API ────────────────────────────────────────────────

export async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  if (!model) {
    throw new Error('Gemini not initialized — check GEMINI_API_KEY');
  }
  if (isCircuitOpen()) {
    throw new Error('Gemini circuit breaker is open — too many recent failures. Try again shortly.');
  }

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  return withRetry(
    () => withTimeout(
      model!.generateContent(fullPrompt).then(r => r.response.text()),
      GEMINI_TIMEOUT_MS,
      'callGemini',
    ),
    'callGemini',
  );
}

export async function callGeminiJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const response = await callGemini(prompt, systemPrompt);

  // Strip markdown code fences if present
  let jsonStr = response.trim();
  const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonStr = fenced[1].trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    // Try to extract a bare JSON object/array from the response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    const match = objMatch || arrMatch;
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`Gemini response is not valid JSON: ${response.substring(0, 300)}`);
  }
}

export async function callGeminiWithTools(prompt: string, tools: Tool[], systemPrompt?: string): Promise<any> {
  if (!model) {
    throw new Error('Gemini not initialized — check GEMINI_API_KEY');
  }
  if (isCircuitOpen()) {
    throw new Error('Gemini circuit breaker is open — too many recent failures.');
  }

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  return withRetry(
    async () => {
      const result = await withTimeout(
        model!.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          tools,
        }),
        GEMINI_TIMEOUT_MS,
        'callGeminiWithTools',
      );
      const response = result.response;
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        return { type: 'function_call', functionCall: functionCalls[0] };
      }
      return { type: 'text', text: response.text() };
    },
    'callGeminiWithTools',
  );
}

export function isGeminiAvailable(): boolean {
  return model !== null && !isCircuitOpen();
}

/** Expose circuit breaker state for the health check endpoint. */
export function getGeminiHealth(): { available: boolean; circuitOpen: boolean; failureCount: number } {
  return {
    available: model !== null,
    circuitOpen: isCircuitOpen(),
    failureCount,
  };
}
