// BookingDetailScreen — Status timeline, reasoning, actions
import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView,
  StatusBar, ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { apiService } from '../services/api';

const TIMELINE_STEPS = [
  { status: 'pending',           label: 'Request Sent',     icon: '📤' },
  { status: 'confirmed',         label: 'Provider Confirmed',icon: '✅' },
  { status: 'provider_en_route', label: 'On the Way',       icon: '🚗' },
  { status: 'in_progress',       label: 'In Progress',      icon: '🔧' },
  { status: 'completed',         label: 'Completed',        icon: '🎉' },
  { status: 'rated',             label: 'Rated',            icon: '⭐' },
];

const STATUS_ORDER = ['pending', 'booked', 'confirmed', 'provider_en_route', 'in_progress', 'completed', 'rated'];

export default function BookingDetailScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReasoning, setShowReasoning] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getBooking(bookingId);
      setBooking(data);
    } catch {
      Alert.alert('Error', 'Could not load booking details.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepIdx = STATUS_ORDER.indexOf(booking?.status ?? '');

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await apiService.cancelBooking(bookingId);
            load();
          } catch { Alert.alert('Error', 'Could not cancel booking.'); }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) return null;

  const canRate = booking.status === 'completed';
  const canCancel = ['pending', 'confirmed', 'booked'].includes(booking.status);
  const isDelayed = booking.status === 'delayed';
  const delay = (booking as any).delay;
  const traces: any[] = booking.reasoning_traces ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}
          accessibilityLabel="Go back" accessibilityRole="button"
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>Booking Details</Text>
        <Text style={styles.bookingId} numberOfLines={1}>#{bookingId?.slice(0, 6)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ⚠️ Delay Banner — shown when provider reports running late */}
        {(isDelayed || delay) && delay && (
          <View style={styles.delayBanner}>
            <Text style={styles.delayBannerIcon}>⚠️</Text>
            <View style={styles.delayBannerText}>
              <Text style={styles.delayBannerTitle}>Provider Running Late</Text>
              <Text style={styles.delayBannerDesc}>
                {(booking as any).provider_name} is running {delay.delay_minutes} minutes late.{'\n'}
                <Text style={styles.delayBannerReason}>Reason: {delay.reason}</Text>
              </Text>
              <View style={styles.delayTimeRow}>
                <View style={styles.delayTimeItem}>
                  <Text style={styles.delayTimeLabel}>Original</Text>
                  <Text style={styles.delayTimeOld}>{delay.original_scheduled_time}</Text>
                </View>
                <Text style={styles.delayArrow}>→</Text>
                <View style={styles.delayTimeItem}>
                  <Text style={styles.delayTimeLabel}>New ETA</Text>
                  <Text style={styles.delayTimeNew}>{delay.new_scheduled_time}</Text>
                </View>
              </View>
              <Text style={styles.delayNotice}>📲 You have been notified about this update.</Text>
            </View>
          </View>
        )}

        {/* Provider card */}
        <View style={styles.providerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(booking.provider_name ?? 'P')[0]}</Text>
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{booking.provider_name}</Text>
            <Text style={styles.serviceType}>
              {booking.service_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </Text>
            <Text style={styles.scheduledTime}>📅 {booking.scheduled_time}</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.price}>Rs. {booking.price?.quoted?.toLocaleString()}</Text>
            <Text style={styles.priceSub}>quoted</Text>
          </View>
        </View>

        {/* Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Status</Text>
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, idx) => {
              const stepOrderIdx = STATUS_ORDER.indexOf(step.status);
              const isDone = stepOrderIdx <= currentStepIdx;
              const isCurrent = step.status === booking.status ||
                (booking.status === 'booked' && step.status === 'confirmed');
              return (
                <View key={step.status} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, isDone && styles.timelineDotDone, isCurrent && styles.timelineDotCurrent]}>
                      <Text style={styles.timelineDotIcon}>{isDone ? '✓' : ''}</Text>
                    </View>
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone]}>
                      {step.icon} {step.label}
                    </Text>
                    {isCurrent && <Text style={styles.timelineCurrent}>← Current status</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Price Breakdown */}
        {booking.price?.breakdown && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            <View style={styles.breakdownCard}>
              {[
                ['Base Rate', `Rs. ${booking.price.breakdown.base_rate}`],
                ['Complexity (×)', `${booking.price.breakdown.complexity_multiplier}x`],
                ['Urgency (×)', `${booking.price.breakdown.urgency_factor}x`],
                ['Distance', `Rs. ${booking.price.breakdown.distance_cost}`],
                ['Materials', `Rs. ${booking.price.breakdown.material_estimate}`],
              ].map(([label, val]) => (
                <View key={label} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{label}</Text>
                  <Text style={styles.breakdownValue}>{val}</Text>
                </View>
              ))}
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs. {booking.price.quoted?.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* AI Reasoning Traces */}
        {traces.length > 0 && (
          <View style={styles.section}>
            <Pressable style={styles.reasoningHeader} onPress={() => setShowReasoning(!showReasoning)}>
              <Text style={styles.sectionTitle}>🤖 How AI Matched You</Text>
              <Text style={styles.expandIcon}>{showReasoning ? '▲' : '▼'}</Text>
            </Pressable>

            {showReasoning && (
              <View style={styles.reasoningCard}>
                {traces.map((trace, i) => (
                  <View key={i} style={styles.traceItem}>
                    <View style={[styles.traceBadge, { backgroundColor: getTraceBg(trace.agent) }]}>
                      <Text style={[styles.traceAgent, { color: getTraceColor(trace.agent) }]}>{trace.agent}</Text>
                    </View>
                    <Text style={styles.traceDecision}>{trace.decision}</Text>
                    {trace.confidence !== undefined && (
                      <Text style={styles.traceConfidence}>Confidence: {(trace.confidence * 100).toFixed(0)}%</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canRate && (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Rating', { bookingId, providerName: booking.provider_name })}
            >
              <Text style={styles.primaryBtnText}>⭐ Rate this Service</Text>
            </Pressable>
          )}
          {canCancel && (
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getTraceColor(agent: string) {
  if (agent?.includes('NLU')) return COLORS.trace.nlu;
  if (agent?.includes('Match')) return COLORS.trace.matching;
  if (agent?.includes('Pricing')) return COLORS.trace.pricing;
  if (agent?.includes('Booking')) return COLORS.success;
  return COLORS.trace.supervisor;
}

function getTraceBg(agent: string) {
  if (agent?.includes('NLU')) return '#F5F3FF';
  if (agent?.includes('Match')) return '#EFF6FF';
  if (agent?.includes('Pricing')) return '#FFFBEB';
  if (agent?.includes('Booking')) return '#ECFDF5';
  return '#FDF2F8';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  // ✅ Fixed: was 40×40 (below 44px WCAG minimum)
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.bg.secondary },
  backIcon: { fontSize: 20, color: COLORS.text.primary },
  title: { flex: 1, textAlign: 'center', fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary, marginHorizontal: SPACING.sm },
  bookingId: { fontSize: FONT.size.sm, color: COLORS.text.secondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flexShrink: 0 },
  scroll: { padding: SPACING.lg },

  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  avatar: { width: 52, height: 52, borderRadius: RADIUS.full, backgroundColor: COLORS.brand.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.inverse },
  providerInfo: { flex: 1, gap: 3 },
  providerName: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  serviceType: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  scheduledTime: { fontSize: FONT.size.xs, color: COLORS.text.tertiary },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.brand.secondary },
  priceSub: { fontSize: FONT.size.xs, color: COLORS.text.tertiary },

  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.text.primary, marginBottom: SPACING.md },

  timeline: { paddingLeft: SPACING.sm },
  timelineRow: { flexDirection: 'row', gap: SPACING.md },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineDot: { width: 28, height: 28, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  timelineDotDone: { backgroundColor: COLORS.brand.primary, borderColor: COLORS.brand.primary },
  timelineDotCurrent: { borderColor: COLORS.brand.primary, backgroundColor: COLORS.successBg ?? '#ECFDF5' },
  timelineDotIcon: { fontSize: 12, color: COLORS.text.inverse, fontWeight: FONT.weight.bold },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  timelineLineDone: { backgroundColor: COLORS.brand.primary },
  timelineContent: { flex: 1, paddingBottom: SPACING.lg, gap: 3 },
  timelineLabel: { fontSize: FONT.size.md, color: COLORS.text.secondary, fontWeight: FONT.weight.medium },
  timelineLabelDone: { color: COLORS.text.primary, fontWeight: FONT.weight.semibold },
  timelineCurrent: { fontSize: FONT.size.xs, color: COLORS.brand.primary, fontWeight: FONT.weight.medium },

  breakdownCard: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  breakdownLabel: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  breakdownValue: { fontSize: FONT.size.sm, color: COLORS.text.primary, fontWeight: FONT.weight.medium },
  breakdownTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm, paddingTop: SPACING.sm },
  totalLabel: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  totalValue: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.brand.secondary },

  reasoningHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandIcon: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  reasoningCard: { backgroundColor: COLORS.brand.amberLight, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.brand.amberBorder, gap: SPACING.md, marginTop: SPACING.sm },
  traceItem: { gap: SPACING.xs },
  traceBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3, alignSelf: 'flex-start' },
  traceAgent: { fontSize: FONT.size.xs, fontWeight: FONT.weight.bold },
  traceDecision: { fontSize: FONT.size.sm, color: COLORS.text.primary },
  traceConfidence: { fontSize: FONT.size.xs, color: COLORS.text.secondary },

  actions: { gap: SPACING.md },
  primaryBtn: { backgroundColor: COLORS.brand.primary, borderRadius: RADIUS.md, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOW.brand },
  primaryBtnText: { color: COLORS.text.inverse, fontSize: FONT.size.md, fontWeight: FONT.weight.bold },
  cancelBtn: { borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.error, paddingVertical: SPACING.lg, alignItems: 'center' },
  cancelBtnText: { color: COLORS.error, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },

  // Delay banner
  delayBanner: {
    flexDirection: 'row', gap: SPACING.md,
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1.5, borderColor: COLORS.warning + '60',
  },
  delayBannerIcon: { fontSize: 28 },
  delayBannerText: { flex: 1, gap: SPACING.xs },
  delayBannerTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: '#92400E' },
  delayBannerDesc: { fontSize: FONT.size.sm, color: '#78350F', lineHeight: 20 },
  delayBannerReason: { fontStyle: 'italic', color: '#92400E' },
  delayTimeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xs },
  delayTimeItem: { gap: 2 },
  delayTimeLabel: { fontSize: FONT.size.xs, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  delayTimeOld: { fontSize: FONT.size.sm, color: COLORS.error, textDecorationLine: 'line-through', fontWeight: FONT.weight.medium },
  delayTimeNew: { fontSize: FONT.size.sm, color: COLORS.success, fontWeight: FONT.weight.bold },
  delayArrow: { fontSize: FONT.size.lg, color: COLORS.warning, fontWeight: FONT.weight.bold },
  delayNotice: { fontSize: FONT.size.xs, color: '#92400E', marginTop: SPACING.xs },
});
