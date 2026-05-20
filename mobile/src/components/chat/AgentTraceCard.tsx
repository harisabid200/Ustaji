// AgentTraceCard — Collapsible reasoning trace panel
// Shows the AI's thinking: observation → decision → confidence
// Design: amber/gold accent to distinguish from chat bubbles
// Field mapping: server sends observation, decision, reasoning, step — NOT thought/action/result

import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../../theme';
import { AgentTrace, AgentName } from '../../types/chat';

const AGENT_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  'NLU Agent':        { emoji: '🧠', color: COLORS.trace.nlu,        label: 'Language Understanding' },
  'Matching Agent':   { emoji: '🎯', color: COLORS.trace.matching,    label: 'Provider Matching' },
  'Pricing Agent':    { emoji: '💰', color: COLORS.trace.pricing,     label: 'Dynamic Pricing' },
  'Scheduling Agent': { emoji: '📅', color: COLORS.trace.scheduling,  label: 'Scheduling' },
  'Supervisor':       { emoji: '🤖', color: COLORS.trace.supervisor,  label: 'Orchestrator' },
  // New agent names from server
  'NLUAgent':         { emoji: '🧠', color: COLORS.trace.nlu,        label: 'Language Understanding' },
  'MatchingAgent':    { emoji: '🎯', color: COLORS.trace.matching,    label: 'Provider Matching' },
  'PricingAgent':     { emoji: '💰', color: COLORS.trace.pricing,     label: 'Dynamic Pricing' },
  'SchedulingAgent':  { emoji: '📅', color: COLORS.trace.scheduling,  label: 'Scheduling' },
  'ComplexityAgent':  { emoji: '🔬', color: '#7C3AED',               label: 'Job Classification' },
  'BookingAgent':     { emoji: '✅', color: COLORS.success,           label: 'Booking Confirmed' },
  'DisputeAgent':     { emoji: '⚖️', color: COLORS.error,            label: 'Dispute Handler' },
};

interface AgentTraceCardProps {
  trace: AgentTrace;
  index: number;
}

export const AgentTraceCard = memo(function AgentTraceCard({
  trace,
  index,
}: AgentTraceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = AGENT_CONFIG[trace.agent] || {
    emoji: '⚙️',
    color: COLORS.brand.amber,
    label: trace.agent,
  };

  // Server field mapping:
  // trace.decision   → primary summary line (what the agent decided)
  // trace.observation → what the agent observed/saw
  // trace.reasoning  → detailed breakdown (object → stringify)
  // trace.step       → which step in the pipeline
  const summaryText = (trace as any).decision || (trace as any).action || '—';
  const observationText = (trace as any).observation || (trace as any).thought || '';
  const reasoningData = (trace as any).reasoning;
  const reasoningText = reasoningData
    ? (typeof reasoningData === 'string' ? reasoningData : JSON.stringify(reasoningData, null, 2))
    : '';
  const confidencePct = trace.confidence !== undefined ? Math.round(trace.confidence * 100) : null;

  return (
    <Pressable
      onPress={() => setExpanded((prev) => !prev)}
      style={({ pressed }) => [styles.card, { borderLeftColor: config.color }, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${config.label} reasoning trace, tap to ${expanded ? 'collapse' : 'expand'}`}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: config.color + '18', borderColor: config.color + '50' }]}>
          <Text style={styles.badgeEmoji}>{config.emoji}</Text>
          <Text style={[styles.badgeText, { color: config.color }]} numberOfLines={1}>{config.label}</Text>
        </View>
        <View style={styles.headerRight}>
          {confidencePct !== null && (
            <View style={[styles.confidencePill, { backgroundColor: config.color + '18' }]}>
              <Text style={[styles.confidenceText, { color: config.color }]}>{confidencePct}%</Text>
            </View>
          )}
          <Text style={[styles.chevron, expanded && styles.chevronUp]}>▾</Text>
        </View>
      </View>

      {/* Decision summary (always visible, 2 lines max) */}
      <Text style={styles.summaryText} numberOfLines={expanded ? undefined : 2}>
        {summaryText}
      </Text>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.detail}>
          {observationText ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: config.color }]}>💭 Observation</Text>
              <Text style={styles.detailValue}>{observationText}</Text>
            </View>
          ) : null}

          {reasoningText ? (
            <>
              <View style={[styles.divider, { backgroundColor: config.color + '30' }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: config.color }]}>📊 Reasoning</Text>
                <Text style={styles.detailValue}>{reasoningText}</Text>
              </View>
            </>
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderLeftWidth: 3,
    // borderLeftColor set dynamically
  },
  cardPressed: {
    opacity: 0.82,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 5,
    maxWidth: '70%',
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  confidencePill: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  confidenceText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
  },
  chevron: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  chevronUp: {
    transform: [{ rotate: '180deg' }],
  },
  summaryText: {
    fontSize: FONT.size.sm,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  detail: {
    marginTop: SPACING.sm,
  },
  detailRow: {
    marginVertical: SPACING.xs,
  },
  detailLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: FONT.size.sm,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.xs,
  },
});
