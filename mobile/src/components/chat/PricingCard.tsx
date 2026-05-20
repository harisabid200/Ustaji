import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../../theme';
import { PricingResult } from '../../types/chat';

interface PricingCardProps { pricing: PricingResult; }

export const PricingCard = memo(function PricingCard({ pricing }: PricingCardProps) {
  // Server returns PricingResult with primary_quote not breakdown
  const quote = (pricing as any).primary_quote ?? pricing.breakdown;
  const finalPrice = (pricing as any).primary_quote?.total ?? pricing.final_price ?? 0;
  const currency = pricing.currency ?? 'Rs.';
  const alternative = (pricing as any).budget_alternative ?? pricing.alternative;
  const demandLevel = (pricing as any).demand_level;
  const providerEarnings = (pricing as any).provider_earnings;

  if (!quote) return null;

  const baseRate = quote.base_rate ?? quote.base ?? 0;
  const complexityMult = quote.complexity_multiplier ?? 1;
  const urgencyFactor = quote.urgency_factor ?? 1;
  const distanceCost = quote.distance_cost ?? quote.distance_charge ?? 0;
  const surgeFee = quote.surge_fee ?? 0;
  const loyaltyDiscount = quote.loyalty_discount ?? 0;
  const materialEstimate = quote.material_estimate ?? 0;

  const rows = [
    { label: 'Base rate', value: `${currency} ${baseRate.toLocaleString()}` },
    complexityMult !== 1 && { label: `Complexity ×${complexityMult.toFixed(1)}`, value: `+${currency} ${Math.round(baseRate * (complexityMult - 1)).toLocaleString()}` },
    urgencyFactor !== 1 && { label: `Urgency ×${urgencyFactor.toFixed(1)}`, value: `+${currency} ${Math.round(baseRate * complexityMult * (urgencyFactor - 1)).toLocaleString()}` },
    distanceCost > 0 && { label: 'Travel', value: `+${currency} ${distanceCost.toLocaleString()}` },
    materialEstimate > 0 && { label: 'Materials (est.)', value: `+${currency} ${materialEstimate.toLocaleString()}` },
    surgeFee > 0 && { label: '⚡ Surge', value: `+${currency} ${surgeFee.toLocaleString()}` },
    loyaltyDiscount > 0 && { label: '🎁 Loyalty discount', value: `-${currency} ${loyaltyDiscount.toLocaleString()}` },
  ].filter(Boolean) as { label: string; value: string }[];

  // Demand level color
  const demandColor =
    demandLevel === 'high'   ? COLORS.error :
    demandLevel === 'medium' ? COLORS.warning :
    COLORS.success;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>💰</Text>
          <Text style={styles.headerTitle}>Price Breakdown</Text>
        </View>
        {demandLevel && (
          <View style={[styles.demandBadge, { backgroundColor: demandColor + '18' }]}>
            <Text style={[styles.demandText, { color: demandColor }]}>
              {demandLevel === 'high' ? '🔥 High Demand' : demandLevel === 'medium' ? '📈 Normal' : '✅ Low Demand'}
            </Text>
          </View>
        )}
      </View>

      {/* Breakdown rows */}
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}

      <View style={styles.divider} />

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Estimated Total</Text>
        <Text style={styles.totalValue}>{currency} {finalPrice.toLocaleString()}</Text>
      </View>

      {/* Provider earnings split */}
      {providerEarnings > 0 && (
        <View style={styles.earningsRow}>
          <Text style={styles.earningsText}>👨‍🔧 Provider earns: {currency} {providerEarnings.toLocaleString()}</Text>
        </View>
      )}

      {/* Budget alternative */}
      {alternative && (
        <View style={styles.altRow}>
          <Text style={styles.altText} numberOfLines={2}>
            💡 Budget: <Text style={styles.altName}>{alternative.provider_name}</Text> @ {currency} {(alternative.total ?? alternative.price ?? 0).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.brand.amberBorder,
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerEmoji: { fontSize: 16 },
  // Fixed: was COLORS.brand.amberLight (#FEF3C7 — near white on white bg, invisible!)
  // Now: COLORS.brand.amber (#F59E0B — readable amber)
  headerTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.brand.amber,
  },
  demandBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  demandText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  label: {
    fontSize: FONT.size.sm,
    color: COLORS.text.secondary,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  value: {
    fontSize: FONT.size.sm,
    color: COLORS.text.primary,
    fontWeight: FONT.weight.medium,
  },
  divider: { height: 1, backgroundColor: COLORS.brand.amberBorder, marginVertical: SPACING.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  totalValue: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.brand.primary },
  earningsRow: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
  },
  earningsText: {
    fontSize: FONT.size.xs,
    color: COLORS.success,
    fontWeight: FONT.weight.medium,
  },
  altRow: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  altText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, lineHeight: 20 },
  altName: { color: COLORS.brand.primary, fontWeight: FONT.weight.medium },
});
