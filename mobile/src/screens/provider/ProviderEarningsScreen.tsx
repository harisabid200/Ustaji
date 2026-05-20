// ProviderEarningsScreen — Revenue, trust score, review trends
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../../theme';

const WEEKLY = [
  { day: 'Mon', amount: 3500 },
  { day: 'Tue', amount: 7200 },
  { day: 'Wed', amount: 2800 },
  { day: 'Thu', amount: 5500 },
  { day: 'Fri', amount: 1500 },
  { day: 'Sat', amount: 8900 },
  { day: 'Sun', amount: 0 },
];

const MAX_EARNING = Math.max(...WEEKLY.map(d => d.amount));

const TRUST_FACTORS = [
  { label: 'Completion Rate', value: 96, icon: '✅' },
  { label: 'On-Time %', value: 92, icon: '⏰' },
  { label: 'Avg. Rating', value: 88, icon: '⭐' },
  { label: 'Review Recency', value: 85, icon: '📝' },
  { label: 'Cancellation Rate', value: 95, icon: '❌' },
  { label: 'Response Time', value: 78, icon: '⚡' },
];

export default function ProviderEarningsScreen() {
  const weeklyTotal = WEEKLY.reduce((s, d) => s + d.amount, 0);
  const trustScore = Math.round(TRUST_FACTORS.reduce((s, f) => s + f.value, 0) / TRUST_FACTORS.length);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>Earnings & Ratings</Text>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.successBg }]}>
            <Text style={styles.summaryIcon}>💰</Text>
            <Text style={styles.summaryValue}>Rs. {weeklyTotal.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#F5F3FF' }]}>
            <Text style={styles.summaryIcon}>🏆</Text>
            <Text style={[styles.summaryValue, { color: trustScore >= 80 ? COLORS.success : COLORS.warning }]}>{trustScore}</Text>
            <Text style={styles.summaryLabel}>Trust Score</Text>
          </View>
        </View>

        {/* Weekly bar chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Earnings</Text>
          <View style={styles.chart}>
            {WEEKLY.map(day => (
              <View key={day.day} style={styles.barWrap}>
                <Text style={styles.barAmount}>
                  {day.amount > 0 ? `${(day.amount / 1000).toFixed(1)}k` : ''}
                </Text>
                <View style={styles.barBg}>
                  <View style={[styles.bar, { height: MAX_EARNING > 0 ? `${(day.amount / MAX_EARNING) * 100}%` : '0%' }]} />
                </View>
                <Text style={styles.barDay}>{day.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Trust Score Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trust Score Breakdown</Text>
          <View style={styles.trustCard}>
            <View style={styles.trustCircle}>
              <Text style={styles.trustBig}>{trustScore}</Text>
              <Text style={styles.trustSub}>/ 100</Text>
            </View>
            <View style={styles.trustFactors}>
              {TRUST_FACTORS.map(f => (
                <View key={f.label} style={styles.factorRow}>
                  <Text style={styles.factorIcon}>{f.icon}</Text>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <View style={styles.factorBarBg}>
                    <View style={[styles.factorBar, { width: `${f.value}%`, backgroundColor: f.value >= 80 ? COLORS.success : f.value >= 60 ? COLORS.warning : COLORS.error }]} />
                  </View>
                  <Text style={styles.factorValue}>{f.value}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: SPACING.xxxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  summaryRow: { flexDirection: 'row', gap: SPACING.md, padding: SPACING.lg },
  summaryCard: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  summaryIcon: { fontSize: 28 },
  summaryValue: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  summaryLabel: { fontSize: FONT.size.xs, color: COLORS.text.secondary },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary, marginBottom: SPACING.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.xs, height: 140 },
  barWrap: { flex: 1, alignItems: 'center', gap: SPACING.xs },
  barAmount: { fontSize: 9, color: COLORS.text.secondary, height: 14 },
  barBg: { flex: 1, width: '100%', backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.sm, overflow: 'hidden', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: COLORS.brand.primary, borderRadius: RADIUS.sm },
  barDay: { fontSize: FONT.size.xs, color: COLORS.text.secondary },
  trustCard: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm, gap: SPACING.lg },
  trustCircle: { alignItems: 'center', gap: 2 },
  trustBig: { fontSize: FONT.size.xxxl, fontWeight: FONT.weight.bold, color: COLORS.success },
  trustSub: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  trustFactors: { gap: SPACING.sm },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  factorIcon: { fontSize: 16, width: 20 },
  factorLabel: { fontSize: FONT.size.sm, color: COLORS.text.secondary, width: 110 },
  factorBarBg: { flex: 1, height: 8, backgroundColor: COLORS.bg.tertiary, borderRadius: RADIUS.full, overflow: 'hidden' },
  factorBar: { height: '100%', borderRadius: RADIUS.full },
  factorValue: { fontSize: FONT.size.xs, color: COLORS.text.secondary, width: 32, textAlign: 'right' },
});
