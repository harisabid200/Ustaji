// ChatBubble — WhatsApp-style message bubble
// Follows mobile-design skill: min 44px touch, memoized, no inline styles

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../../theme';
import { ChatMessage } from '../../types/chat';
import { AgentTraceCard } from './AgentTraceCard';
import { ProviderCard } from './ProviderCard';
import { PricingCard } from './PricingCard';

interface ChatBubbleProps {
  message: ChatMessage;
  onProviderSelect?: (providerId: string) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const ChatBubble = memo(function ChatBubble({
  message,
  onProviderSelect,
}: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // System messages (stage announcements)
  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <View style={styles.systemBubble}>
          <Text style={styles.systemText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAgent]}>
      {/* Avatar for agent messages */}
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}

      <View style={[styles.bubbleWrapper, isUser ? styles.wrapperUser : styles.wrapperAgent]}>
        {/* Main bubble */}
        <View style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAgent,
          SHADOW.sm,
        ]}>
          <Text style={[styles.messageText, isUser ? styles.textUser : styles.textAgent]}>
            {message.content}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAgent]}>
            {message.timestamp instanceof Date
              ? formatTime(message.timestamp)
              : formatTime(new Date(message.timestamp))}
          </Text>
        </View>

        {/* Agent Reasoning Traces */}
        {!isUser && message.traces && message.traces.length > 0 && (
          <View style={styles.traceContainer}>
            {message.traces.map((trace, idx) => (
              <AgentTraceCard key={idx} trace={trace} index={idx} />
            ))}
          </View>
        )}

        {/* Provider Cards */}
        {!isUser && message.providers && message.providers.length > 0 && (
          <View style={styles.cardsContainer}>
            {message.providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onSelect={() => onProviderSelect?.(provider.id)}
              />
            ))}
          </View>
        )}

        {/* Pricing Card */}
        {!isUser && message.pricing && (
          <PricingCard pricing={message.pricing} />
        )}
      </View>

      {/* Spacer for user messages to align right */}
      {isUser && <View style={styles.userSpacer} />}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAgent: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 16,
  },
  bubbleWrapper: {
    maxWidth: '80%',
  },
  wrapperUser: {
    alignItems: 'flex-end',
  },
  wrapperAgent: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xs,
    overflow: 'hidden', // ✅ clip any content that reaches the boundary
  },
  bubbleUser: {
    backgroundColor: COLORS.bubble.user,
    borderBottomRightRadius: RADIUS.sm,
  },
  bubbleAgent: {
    backgroundColor: COLORS.bubble.agent,
    borderBottomLeftRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: FONT.size.md,
    lineHeight: 22,
    flexShrink: 1,
  },
  textUser: {
    color: COLORS.bubble.userText,
  },
  textAgent: {
    color: COLORS.bubble.agentText,
  },
  timestamp: {
    fontSize: FONT.size.xs,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  timestampAgent: {
    color: COLORS.text.tertiary,
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  systemBubble: {
    backgroundColor: COLORS.bg.elevated,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  systemText: {
    color: COLORS.text.secondary,
    fontSize: FONT.size.xs,
    textAlign: 'center',
  },
  traceContainer: {
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  cardsContainer: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  userSpacer: {
    width: 32 + SPACING.sm,
  },
});
