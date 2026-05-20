import { callGeminiWithTools, isGeminiAvailable } from '../services/gemini';
import { NLUResult, AgentTrace, ServiceCategory } from '../utils/types';
import { COLLOQUIAL_MAPPINGS } from '../data/providers';
import { v4 as uuid } from 'uuid';
import { FunctionDeclaration, Schema, SchemaType, Tool } from '@google/generative-ai';

// ─────────────────────────────────────────────────────────────
// Improved system prompt and tool definition for Agentic Workflow
// ─────────────────────────────────────────────────────────────
const NLU_SYSTEM_PROMPT = `You are an expert multilingual NLU agent for UstaJi, Pakistan's informal service marketplace.
You understand Urdu (اردو), Roman Urdu, English, and Urdu-English code-switching naturally.

Your primary goal is to use the "extract_service_intent" tool to structure the user's request.

LANGUAGE PATTERNS TO HANDLE:
- "AC nahi chal raha" / "AC kharab hai" → ac_repair
- "bijli nahi" / "light nahi" / "electrician chahiye" → electrical
- "paani ka masla" / "pipe phoot gayi" / "plumber" → plumbing
- "geyser" / "water heater" → home_appliance
- "kal subah" → urgency: tomorrow, slot: morning
- "aaj shaam" → urgency: today, slot: evening  
- "abhi / forun / emergency" → urgency: emergency
- "budget zyada nahi" / "sasta chahiye" → budget_sensitivity: high
- Locations anywhere in Pakistan: DHA, Bahria Town, Lahore, Karachi, F-7, etc.

CONFIDENCE RULES:
- Both service_type AND location clearly identified → 0.85+
- Only service_type identified → 0.6
- Neither clear → 0.3, add clarification_needed questions
`;

const extractServiceIntentSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    service_type: {
      type: SchemaType.STRING,
      description: "The primary service category, e.g., ac_repair, plumbing, electrical, carpentry, painting, cleaning, tutoring, beauty, driving, mechanic, home_appliance",
    },
    service_subtype: {
      type: SchemaType.STRING,
      description: "Specific sub-task if mentioned, e.g., 'gas_refill', 'split_ac', 'wiring'",
    },
    location_raw: {
      type: SchemaType.STRING,
      description: "Exact location string extracted from user, e.g., 'G-13', 'DHA Lahore'",
    },
    location_confidence: {
      type: SchemaType.NUMBER,
      description: "Confidence (0.0 to 1.0) that a location was explicitly provided",
    },
    urgency: {
      type: SchemaType.STRING,
      description: "emergency | today | tomorrow | this_week | flexible",
    },
    preferred_slot: {
      type: SchemaType.STRING,
      description: "morning | afternoon | evening | night | null",
    },
    budget_sensitivity: {
      type: SchemaType.STRING,
      description: "low | medium | high",
    },
    issue_severity: {
      type: SchemaType.STRING,
      description: "low | medium | high | critical",
    },
    issue_description: {
      type: SchemaType.STRING,
      description: "1-sentence English summary of the request",
    },
    confidence_score: {
      type: SchemaType.NUMBER,
      description: "Overall confidence (0.0 to 1.0) in extracting service and location",
    },
    clarification_needed: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Array of questions to ask if confidence is low, e.g., 'Aap ka area konsa hai?'",
    },
    detected_language: {
      type: SchemaType.STRING,
      description: "en | ur | roman_ur | mixed",
    }
  },
  required: ["service_type", "location_raw", "location_confidence", "urgency", "budget_sensitivity", "issue_severity", "issue_description", "confidence_score", "detected_language"],
};

const nluTools: Tool[] = [{
  functionDeclarations: [
    {
      name: "extract_service_intent",
      description: "Extracts the service intent, location, time preference, and constraints from a user's natural language message.",
      parameters: extractServiceIntentSchema
    }
  ]
}];

export async function runNLUAgent(userMessage: string): Promise<{ result: NLUResult; trace: AgentTrace }> {
  const startTime = Date.now();

  // Pre-scan for service keyword hints
  const lowered = userMessage.toLowerCase();
  let hintedService: string | null = null;
  for (const [keyword, service] of Object.entries(COLLOQUIAL_MAPPINGS)) {
    if (lowered.includes(keyword)) {
      hintedService = service;
      break;
    }
  }

  // ── Path 1: Agentic Gemini NLU with Tools ────────────────────────────────────
  if (isGeminiAvailable()) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const prompt = `Analyze this service request from a Pakistani user and use the extract_service_intent tool to structure the data.

USER MESSAGE: "${userMessage}"
TODAY: ${today}
TOMORROW: ${tomorrow}
${hintedService ? `KEYWORD HINT: message likely relates to "${hintedService}"` : ''}`;

    try {
      const response = await callGeminiWithTools(prompt, nluTools, NLU_SYSTEM_PROMPT);

      if (response.type === 'function_call' && response.functionCall.name === 'extract_service_intent') {
        const args = response.functionCall.args;
        
        const nluResult: NLUResult = {
          service_type: (args.service_type as ServiceCategory) || 'home_appliance',
          service_subtype: args.service_subtype || undefined,
          location: {
            raw: args.location_raw || '',
            confidence: args.location_confidence || 0
          },
          time_preference: {
            urgency: (args.urgency as any) || 'flexible',
            preferred_slot: (args.preferred_slot as any) || undefined
          },
          constraints: {
            budget_sensitivity: (args.budget_sensitivity as any) || 'medium',
            gender_preference: 'any'
          },
          issue_severity: (args.issue_severity as any) || 'medium',
          issue_description: args.issue_description || '',
          confidence_score: args.confidence_score || 0.5,
          clarification_needed: args.clarification_needed || [],
          detected_language: (args.detected_language as any) || 'mixed',
          raw_input: userMessage
        };

        const duration = Date.now() - startTime;
        const trace: AgentTrace = {
          id: uuid(),
          agent: 'NLUAgent',
          step: 'tool_extraction',
          observation: `[Gemini Tool] Used extract_service_intent for message: "${userMessage}"`,
          reasoning: {
            method: 'gemini-2.5-flash-tools',
            detected_service: nluResult.service_type,
            location: nluResult.location?.raw,
            urgency: nluResult.time_preference?.urgency,
            confidence: nluResult.confidence_score,
            duration_ms: duration,
            tool_called: 'extract_service_intent'
          },
          decision: `Extracted: ${nluResult.service_type} | Loc: ${nluResult.location?.raw || '?'} | Conf: ${nluResult.confidence_score.toFixed(2)}`,
          confidence: nluResult.confidence_score,
          action: nluResult.confidence_score >= 0.7 ? 'proceed_to_matching' : 'ask_clarification',
          timestamp: new Date().toISOString(),
        };

        console.log(`✅ NLU [Agentic Tool] → ${nluResult.service_type} @ ${nluResult.location?.raw} (${nluResult.confidence_score.toFixed(2)}) in ${duration}ms`);
        return { result: nluResult, trace };
      } else {
        throw new Error('Gemini did not call the extract_service_intent tool');
      }
    } catch (error: any) {
      console.error(`❌ NLU Gemini Agent failed (${Date.now() - startTime}ms): ${error.message}`);
      console.error('   Falling back to keyword NLU');
    }
  } else {
    console.warn('⚠️  NLU: Gemini not available, using keyword fallback');
  }

  // ── Path 2: Keyword Fallback ──────────────────────────────
  const fallbackResult = keywordFallbackNLU(userMessage, hintedService);
  const trace: AgentTrace = {
    id: uuid(),
    agent: 'NLUAgent',
    step: 'fallback_extraction',
    observation: `[Keyword] Gemini unavailable, keyword fallback: "${userMessage}"`,
    reasoning: { method: 'keyword', hinted_service: hintedService },
    decision: `Fallback: ${fallbackResult.service_type} (confidence: ${fallbackResult.confidence_score.toFixed(2)})`,
    confidence: fallbackResult.confidence_score,
    action: fallbackResult.confidence_score >= 0.7 ? 'proceed_to_matching' : 'ask_clarification',
    timestamp: new Date().toISOString(),
  };
  return { result: fallbackResult, trace };
}

function keywordFallbackNLU(message: string, hintedService: string | null): NLUResult {
  const lowered = message.toLowerCase();

  const locationMatch = lowered.match(/([a-z]-\d{1,2}|rawalpindi|islamabad|blue area|saddar|dha|bahria)/i);
  const location = locationMatch ? locationMatch[0].toUpperCase() : '';

  let urgency: NLUResult['time_preference']['urgency'] = 'flexible';
  if (lowered.match(/abhi|forun|emergency|urgent/)) urgency = 'emergency';
  else if (lowered.match(/aaj|today/)) urgency = 'today';
  else if (lowered.match(/kal|tomorrow/)) urgency = 'tomorrow';
  else if (lowered.match(/is hafte|this week/)) urgency = 'this_week';

  let slot: NLUResult['time_preference']['preferred_slot'] = undefined;
  if (lowered.match(/subah|morning/)) slot = 'morning';
  else if (lowered.match(/dopahar|afternoon/)) slot = 'afternoon';
  else if (lowered.match(/shaam|evening/)) slot = 'evening';
  else if (lowered.match(/raat|night/)) slot = 'night';

  let budget: NLUResult['constraints']['budget_sensitivity'] = 'medium';
  if (lowered.match(/sasta|budget|zyada nahi|kam paise|affordable/)) budget = 'high';
  else if (lowered.match(/best|premium|achha|quality/)) budget = 'low';

  let severity: NLUResult['issue_severity'] = 'medium';
  if (lowered.match(/bilkul|completely|emergency|nahi chal|band ho/)) severity = 'critical';
  else if (lowered.match(/nahi kar raha|not working|kharab/)) severity = 'high';
  else if (lowered.match(/thora|little|minor/)) severity = 'low';

  let confidence = 0.3;
  if (hintedService) confidence += 0.3;
  if (location) confidence += 0.2;
  if (urgency !== 'flexible') confidence += 0.1;
  if (slot) confidence += 0.05;
  if (severity !== 'medium') confidence += 0.05;

  const clarifications: string[] = [];
  if (!hintedService) clarifications.push('Kya service chahiye? (AC repair, plumbing, electrical, etc.)');
  if (!location) clarifications.push('Aap ka area/sector kya hai?');

  return {
    service_type: (hintedService as ServiceCategory) || 'home_appliance',
    location: { raw: location, confidence: location ? 0.8 : 0.3 },
    time_preference: { urgency, preferred_slot: slot },
    constraints: { budget_sensitivity: budget, gender_preference: 'any' },
    issue_severity: severity,
    issue_description: message.substring(0, 100),
    confidence_score: Math.min(confidence, 1.0),
    clarification_needed: clarifications,
    detected_language: 'mixed',
    raw_input: message,
  };
}
