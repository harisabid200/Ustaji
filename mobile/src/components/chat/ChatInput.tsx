// ChatInput — WhatsApp-style input bar with send button and quick replies
// Mobile-design skill:
// - Quick replies: horizontal ScrollView (not flexWrap) — single row, no height explosion
// - Send button: min 44×44px touch target
// - Keyboard-aware: works with KeyboardAvoidingView in parent
// - Platform Enter key support for web
import React, { memo, useState, useRef } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, Text,
  Keyboard, Platform, ScrollView,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../../theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  quickReplies?: string[];
}

export const ChatInput = memo(function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Apna kaam batayein...',
  quickReplies,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  const handleQuickReply = (reply: string) => {
    if (disabled) return;
    onSend(reply);
  };

  // Web: Enter = send, Shift+Enter = newline
  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      {/* Quick replies — horizontal scroll, single row, no wrap */}
      {quickReplies && quickReplies.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickRepliesScroll}
          contentContainerStyle={styles.quickRepliesContent}
          keyboardShouldPersistTaps="handled"
        >
          {quickReplies.map((reply, i) => (
            <Pressable
              key={i}
              onPress={() => handleQuickReply(reply)}
              style={({ pressed }) => [
                styles.quickChip,
                pressed && styles.quickChipPressed,
                disabled && styles.quickChipDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Quick reply: ${reply}`}
            >
              <Text style={styles.quickChipText} numberOfLines={1}>{reply}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          multiline
          maxLength={500}
          onSubmitEditing={Platform.OS !== 'web' ? handleSend : undefined}
          onKeyPress={handleKeyPress}
          blurOnSubmit={Platform.OS === 'ios'}
          editable={!disabled}
          returnKeyType="send"
          accessibilityLabel="Message input"
          textAlignVertical="center"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            canSend ? styles.sendBtnActive : styles.sendBtnDisabled,
            pressed && canSend && styles.sendBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.sendIcon, !canSend && styles.sendIconDisabled]}>➤</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    // No paddingBottom here — parent KeyboardAvoidingView + safe area handles it
  },

  // ✅ Fixed: horizontal ScrollView instead of flexWrap
  // Prevents the quick reply area from growing to 2+ rows and pushing send button off-screen
  quickRepliesScroll: {
    maxHeight: 48,
    paddingTop: SPACING.sm,
  },
  quickRepliesContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 2,
  },
  quickChip: {
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.brand.primary + '55',
    paddingHorizontal: SPACING.md,
    // ✅ Min 36px height (inside scroll context — full row is 48px)
    paddingVertical: 7,
  },
  quickChipPressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
  quickChipDisabled: { opacity: 0.4 },
  quickChipText: {
    color: COLORS.brand.primary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.input,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    color: COLORS.text.primary,
    fontSize: FONT.size.md,
    maxHeight: 120,
    minHeight: 44,
    lineHeight: 20,
  },
  // ✅ 44×44 minimum touch target
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: COLORS.brand.primary,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.bg.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
  sendIcon: {
    fontSize: 18,
    color: '#fff',
  },
  sendIconDisabled: {
    color: COLORS.text.tertiary,
  },
});
