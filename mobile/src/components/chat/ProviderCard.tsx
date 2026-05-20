// ProviderCard — Ranked provider result with match score
// Touch target: min 44px on all interactive elements
// Text overflow: numberOfLines + flexShrink on all variable-length text
// Mobile-design skill: thumb zone CTA, no overflow

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../../theme';
import { RankedProvider } from '../../types/chat';

interface ProviderCardProps {
  provider: RankedProvider;
  onSelect: () => void;
  rank?: number;
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  return '★'.repeat(full) + (rating % 1 >= 0.5 ? '½' : '');
}

export const ProviderCard = memo(function ProviderCard({
  provider,
  onSelect,
  rank,
}: ProviderCardProps) {
  const matchPct = Math.round(provider.match_score * 100);
  const matchColor =
    matchPct >= 80 ? COLORS.brand.primary :
    matchPct >= 60 ? COLORS.brand.amber :
    COLORS.error;

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        SHADOW.sm,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Select ${provider.name}, rated ${provider.rating} stars, ${matchPct}% match`}
    >
      {/* Rank badge — only shown when rank is provided */}
      {rank !== undefined && rank <= 3 && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</Text>
        </View>
      )}

      {/* Top row: Name + Match score */}
      <View style={styles.topRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>
          <Text style={styles.service} numberOfLines={1}>
            {provider.service?.replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={[styles.matchBadge, { borderColor: matchColor }]}>
          <Text style={[styles.matchPct, { color: matchColor }]}>{matchPct}%</Text>
          <Text style={[styles.matchLabel, { color: matchColor }]}>match</Text>
        </View>
      </View>

      {/* Middle row: Rating, distance, location */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.stars}>{renderStars(provider.rating)}</Text>
          <Text style={styles.metaText}>{provider.rating?.toFixed(1)}</Text>
          <Text style={styles.metaTextMuted}>({provider.reviews})</Text>
        </View>
        {provider.distance_km !== undefined && (
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText}>{provider.distance_km?.toFixed(1)} km</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>⏱</Text>
          <Text style={styles.metaText} numberOfLines={1}>{provider.location}</Text>
        </View>
      </View>

      {/* Separator */}
      <View style={styles.separator} />

      {/* Bottom row: Price + availability + CTA */}
      <View style={styles.bottomRow}>
        {/* Price */}
        <View style={styles.priceBlock}>
          <Text style={styles.price}>PKR {provider.base_rate?.toLocaleString()}</Text>
          <Text style={styles.priceLabel}>base rate</Text>
        </View>

        {/* Right side: availability badge + select button */}
        <View style={styles.rightActions}>
          <View style={[
            styles.availBadge,
            { backgroundColor: provider.available ? COLORS.successBg : COLORS.errorBg }
          ]}>
            <Text style={[
              styles.availText,
              { color: provider.available ? COLORS.success : COLORS.error }
            ]} numberOfLines={1}>
              {provider.available ? '● Available' : '○ Busy'}
            </Text>
          </View>
          {/* Min 44px touch target */}
          <Pressable
            onPress={onSelect}
            style={({ pressed }) => [styles.selectBtn, pressed && styles.selectBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Book ${provider.name}`}
          >
            <Text style={styles.selectBtnText}>Select →</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  rankBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  rankText: { fontSize: 18 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  nameBlock: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  name: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  service: {
    fontSize: FONT.size.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  matchBadge: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 52,
  },
  matchPct: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    lineHeight: 22,
  },
  matchLabel: {
    fontSize: 9,
    fontWeight: FONT.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  metaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stars: { color: COLORS.brand.amber, fontSize: FONT.size.sm },
  metaIcon: { fontSize: 12 },
  metaText: { fontSize: FONT.size.xs, color: COLORS.text.secondary },
  metaTextMuted: { fontSize: FONT.size.xs, color: COLORS.text.tertiary },

  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.sm,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  priceBlock: {},
  price: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.text.primary,
  },
  priceLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.text.secondary,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
  },
  availBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  availText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.medium,
  },
  // ✅ Fixed: was minHeight:36 (below 44px minimum). Now minHeight:44.
  selectBtn: {
    backgroundColor: COLORS.brand.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  selectBtnText: {
    color: '#fff',
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
});
