/**
 * Complexity Classification Agent
 * Classifies a job as basic/intermediate/complex based on:
 * - NLU extracted intent (service type, subtype, severity, description)
 * - Provider's skills, certifications, experience, and tools
 *
 * Uses Gemini tool calling when available, falls back to rule engine.
 */
import { NLUResult, Provider, ComplexityClassification, JobComplexity } from '../utils/types';
import { callGeminiWithTools, isGeminiAvailable } from '../services/gemini';
import { SchemaType, Tool } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { AgentTrace } from '../utils/types';

// ── Knowledge base: complexity rules per service ──────────────
const COMPLEXITY_RULES: Record<string, {
  basic: { keywords: string[]; duration: number; tools: string[] };
  intermediate: { keywords: string[]; duration: number; tools: string[] };
  complex: { keywords: string[]; duration: number; tools: string[] };
}> = {
  ac_repair: {
    basic:        { keywords: ['filter clean', 'cleaning', 'service', 'noise', 'not cooling'],       duration: 45,  tools: ['screwdriver', 'brush', 'vacuum'] },
    intermediate: { keywords: ['gas refill', 'gas leak', 'recharge', 'pcb', 'capacitor', 'drain'],  duration: 90,  tools: ['gas cylinder', 'manifold gauge', 'multimeter'] },
    complex:      { keywords: ['compressor', 'install', 'replace', 'central', 'duct'],               duration: 180, tools: ['gas cylinder', 'welding', 'drilling machine', 'manifold gauge'] },
  },
  plumbing: {
    basic:        { keywords: ['tap', 'drip', 'leak', 'flush', 'blockage', 'drain'],                 duration: 30,  tools: ['wrench', 'plunger'] },
    intermediate: { keywords: ['pipe', 'replace', 'water heater', 'toilet seat', 'valve'],           duration: 75,  tools: ['pipe cutter', 'wrench set', 'sealant'] },
    complex:      { keywords: ['full install', 'new bathroom', 'sewage', 'underground', 'overhead'], duration: 240, tools: ['pipe cutter', 'welding', 'excavation tools'] },
  },
  electrical: {
    basic:        { keywords: ['bulb', 'switch', 'socket', 'fan', 'fuse'],                           duration: 30,  tools: ['screwdriver', 'multimeter'] },
    intermediate: { keywords: ['wiring', 'mcb', 'circuit', 'short circuit', 'inverter'],             duration: 90,  tools: ['multimeter', 'wire stripper', 'drill'] },
    complex:      { keywords: ['panel', 'load', 'three phase', 'solar', 'meter', 'main line'],       duration: 180, tools: ['panel tools', 'phase tester', 'heavy gauge wires'] },
  },
  carpentry: {
    basic:        { keywords: ['fix', 'nail', 'hinge', 'lock', 'minor'],                             duration: 45,  tools: ['hammer', 'screwdriver'] },
    intermediate: { keywords: ['shelf', 'cabinet', 'door', 'repair', 'polish'],                     duration: 120, tools: ['saw', 'drill', 'sandpaper'] },
    complex:      { keywords: ['custom', 'full kitchen', 'wardrobe', 'install'],                     duration: 300, tools: ['power saw', 'router', 'measuring tools', 'clamps'] },
  },
  default: {
    basic:        { keywords: [], duration: 45,  tools: [] },
    intermediate: { keywords: [], duration: 90,  tools: [] },
    complex:      { keywords: [], duration: 180, tools: [] },
  },
};

// ── Gemini tool schema ────────────────────────────────────────
const classifyComplexityTool: Tool = {
  functionDeclarations: [{
    name: 'classify_job_complexity',
    description: 'Classify a service job as basic, intermediate, or complex based on the description, provider capabilities, and service type.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        level: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['basic', 'intermediate', 'complex'],
          description: 'Job complexity level',
        },
        confidence: {
          type: SchemaType.NUMBER,
          description: 'Confidence score 0.0 to 1.0',
        },
        reasoning: {
          type: SchemaType.STRING,
          description: 'Clear explanation of why this complexity was chosen',
        },
        matched_skills: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Specific provider skills that match this job',
        },
        missing_skills: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Skills needed for this job that the provider may lack',
        },
        required_tools: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Tools or materials likely needed for this job',
        },
        estimated_duration_minutes: {
          type: SchemaType.NUMBER,
          description: 'Estimated job duration in minutes',
        },
        provider_suitable: {
          type: SchemaType.BOOLEAN,
          description: 'Whether the provider is suitable for this complexity level',
        },
        upsell_opportunity: {
          type: SchemaType.STRING,
          description: 'Optional: if the job may be more complex than described, what additional work might be needed',
        },
      },
      required: ['level', 'confidence', 'reasoning', 'matched_skills', 'missing_skills', 'required_tools', 'estimated_duration_minutes', 'provider_suitable'],
    },
  }],
};

// ── Rule-based fallback ───────────────────────────────────────
function classifyByRules(nlu: NLUResult, provider: Provider): ComplexityClassification {
  const serviceKey = nlu.service_type in COMPLEXITY_RULES ? nlu.service_type : 'default';
  const rules = COMPLEXITY_RULES[serviceKey];
  const description = (nlu.issue_description || nlu.raw_input || '').toLowerCase();
  const subtype = (nlu.service_subtype || '').toLowerCase();
  const searchText = `${description} ${subtype}`;

  let level: JobComplexity = 'basic';
  if (nlu.issue_severity === 'critical' || rules.complex.keywords.some(k => searchText.includes(k))) {
    level = 'complex';
  } else if (nlu.issue_severity === 'high' || rules.intermediate.keywords.some(k => searchText.includes(k))) {
    level = 'intermediate';
  }

  const ruleSet = rules[level];
  const matchedSkills = provider.skills.filter(s =>
    ruleSet.keywords.some(k => s.toLowerCase().includes(k) || k.includes(s.toLowerCase()))
  );

  return {
    level,
    confidence: 0.65,
    reasoning: `Rule-based: ${level} complexity for ${nlu.service_type} based on severity (${nlu.issue_severity}) and keywords in description.`,
    matched_skills: matchedSkills.length > 0 ? matchedSkills : provider.skills.slice(0, 2),
    missing_skills: [],
    required_tools: ruleSet.tools,
    estimated_duration_minutes: ruleSet.duration,
    provider_suitable: provider.service_types.includes(nlu.service_type),
  };
}

// ── Main export ───────────────────────────────────────────────
export async function classifyJobComplexity(
  nlu: NLUResult,
  provider: Provider
): Promise<{ classification: ComplexityClassification; trace: AgentTrace }> {

  const startTime = Date.now();

  if (isGeminiAvailable()) {
    const prompt = `You are UstaJi's Job Complexity Classifier.

SERVICE REQUEST:
- Type: ${nlu.service_type.replace(/_/g, ' ')}
- Subtype: ${nlu.service_subtype || 'not specified'}
- Severity: ${nlu.issue_severity}
- Description: "${nlu.issue_description || nlu.raw_input}"
- Urgency: ${nlu.time_preference.urgency}

ASSIGNED PROVIDER:
- Name: ${provider.name}
- Experience: ${provider.experience_years} years
- Skills: ${provider.skills.join(', ')}
- Certifications: ${provider.certifications.join(', ') || 'none'}
- Service Types: ${provider.service_types.join(', ')}

Classify the job complexity using the classify_job_complexity function.
Consider:
- basic = routine maintenance, minor fixes, 30-60 min
- intermediate = component replacement, moderate repairs, 60-120 min  
- complex = full installation, major overhaul, specialized equipment, 120+ min`;

    try {
      const result = await callGeminiWithTools(prompt, [classifyComplexityTool]);
      if (result.type === 'function_call' && result.functionCall.name === 'classify_job_complexity') {
        const args = result.functionCall.args as ComplexityClassification;
        const classification: ComplexityClassification = {
          level: args.level || 'basic',
          confidence: args.confidence || 0.8,
          reasoning: args.reasoning || '',
          matched_skills: args.matched_skills || [],
          missing_skills: args.missing_skills || [],
          required_tools: args.required_tools || [],
          estimated_duration_minutes: args.estimated_duration_minutes || 60,
          provider_suitable: args.provider_suitable ?? true,
          upsell_opportunity: args.upsell_opportunity,
        };

        const trace: AgentTrace = {
          id: uuid(), agent: 'ComplexityAgent', step: 'gemini_classification',
          observation: `Job: ${nlu.service_type} | Provider: ${provider.name} | Result: ${classification.level}`,
          reasoning: { level: classification.level, matched_skills: classification.matched_skills, required_tools: classification.required_tools },
          decision: `${classification.level.toUpperCase()} complexity — ${classification.reasoning}`,
          confidence: classification.confidence,
          action: 'classification_complete',
          timestamp: new Date().toISOString(),
        };

        console.log(`🧠 ComplexityAgent [Gemini] → ${classification.level} (${Math.round(classification.confidence * 100)}%) in ${Date.now() - startTime}ms`);
        return { classification, trace };
      }
    } catch (e: any) {
      console.warn(`ComplexityAgent Gemini failed: ${e.message} — using rule fallback`);
    }
  }

  // Fallback
  const classification = classifyByRules(nlu, provider);
  const trace: AgentTrace = {
    id: uuid(), agent: 'ComplexityAgent', step: 'rule_classification',
    observation: `[Rule] ${nlu.service_type} severity=${nlu.issue_severity} → ${classification.level}`,
    reasoning: { level: classification.level, method: 'keyword_rules' },
    decision: classification.reasoning,
    confidence: classification.confidence,
    action: 'classification_complete',
    timestamp: new Date().toISOString(),
  };
  console.log(`🧠 ComplexityAgent [Rules] → ${classification.level} in ${Date.now() - startTime}ms`);
  return { classification, trace };
}

/** Convenience: just return the level string quickly using rules (no async) */
export function quickClassifyComplexity(nlu: NLUResult): JobComplexity {
  const serviceKey = nlu.service_type in COMPLEXITY_RULES ? nlu.service_type : 'default';
  const rules = COMPLEXITY_RULES[serviceKey];
  const text = `${nlu.issue_description || ''} ${nlu.service_subtype || ''}`.toLowerCase();
  if (nlu.issue_severity === 'critical' || rules.complex.keywords.some(k => text.includes(k))) return 'complex';
  if (nlu.issue_severity === 'high' || rules.intermediate.keywords.some(k => text.includes(k))) return 'intermediate';
  return 'basic';
}
