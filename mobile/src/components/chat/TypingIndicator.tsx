// Animated typing indicator — 3 bouncing dots
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../theme';

export function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.row}>
      <View style={styles.avatar}><Animated.Text style={styles.avatarEmoji}>🤖</Animated.Text></View>
      <View style={styles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs },
  avatar: { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.elevated, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  avatarEmoji: { fontSize: 16 },
  bubble: { flexDirection: 'row', backgroundColor: COLORS.bubble.agent, borderRadius: RADIUS.lg, borderBottomLeftRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.text.secondary },
});
