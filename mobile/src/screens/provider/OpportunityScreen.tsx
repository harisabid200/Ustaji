// OpportunityScreen — Provider incoming job requests (live from server)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../../theme';
import { apiService } from '../../services/api';
import { useApp } from '../../context/AppContext';

interface Opportunity {
  id: string;
  service_type: string;
  area: string;
  distance_km: number;
  estimated_price: number;
  urgency: string;
  time_limit_seconds: number;
  match_score: number;
  description?: string;
  customer_id: string;
  // local-only countdown tracking
  secondsLeft: number;
}

export default function OpportunityScreen() {
  const { user } = useApp();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const providerId = user?.id ?? '';

  const loadOpportunities = useCallback(async () => {
    try {
      const data = await apiService.getOpportunities(providerId);
      setOpps(data.map((o: any) => ({
        ...o,
        secondsLeft: o.time_limit_seconds ?? 120,
      })));
    } catch {
      setOpps([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadOpportunities();
  }, []);

  // Countdown timer — ticks every second for all opportunities
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setOpps(prev => prev
        .map(o => ({ ...o, secondsLeft: Math.max(0, o.secondsLeft - 1) }))
        .filter(o => o.secondsLeft > 0) // auto-expire timed-out opportunities
      );
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleAccept = async (opp: Opportunity) => {
    setRespondingId(opp.id);
    try {
      await apiService.respondToOpportunity(opp.id, true, providerId);
      setOpps(prev => prev.filter(o => o.id !== opp.id));
      setAcceptedCount(c => c + 1);
    } catch {
      // Demo opportunity or network issue — still remove locally
      setOpps(prev => prev.filter(o => o.id !== opp.id));
      setAcceptedCount(c => c + 1);
    } finally {
      setRespondingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    setRespondingId(id);
    try { await apiService.respondToOpportunity(id, false, providerId); } catch { /* no-op */ }
    setOpps(prev => prev.filter(o => o.id !== id));
    setRespondingId(null);
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const getTimerColor = (s: number) =>
    s <= 30 ? COLORS.error : s <= 60 ? COLORS.warning : COLORS.info;

  const renderOpp = ({ item }: { item: Opportunity }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.service}>🔧 {item.service_type?.replace(/_/g, ' ')}</Text>
        <View style={[styles.matchBadge, {
          backgroundColor: item.match_score >= 90 ? COLORS.successBg : COLORS.warningBg,
        }]}>
          <Text style={[styles.matchText, {
            color: item.match_score >= 90 ? COLORS.success : COLORS.warning,
          }]}>
            {item.match_score}% match
          </Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.issue}>"{item.description}"</Text>
      ) : null}

      <View style={styles.metaGrid}>
        <Text style={styles.meta}>📍 {item.area} ({item.distance_km}km)</Text>
        <Text style={styles.meta}>⏰ {item.urgency}</Text>
        <Text style={styles.meta}>💰 Est. PKR {item.estimated_price.toLocaleString()}</Text>
      </View>

      {/* Live countdown timer */}
      <View style={[styles.timerRow, { borderColor: getTimerColor(item.secondsLeft) + '40', backgroundColor: getTimerColor(item.secondsLeft) + '12' }]}>
        <Text style={[styles.timerText, { color: getTimerColor(item.secondsLeft) }]}>
          ⏳ Respond within {formatTimer(item.secondsLeft)}
          {item.secondsLeft <= 30 ? ' — Expiring soon!' : ''}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.declineBtn, respondingId === item.id && styles.btnDisabled]}
          onPress={() => handleDecline(item.id)}
          disabled={respondingId === item.id}
        >
          <Text style={styles.declineTxt}>✗ Decline</Text>
        </Pressable>
        <Pressable
          style={[styles.acceptBtn, respondingId === item.id && styles.btnDisabled]}
          onPress={() => handleAccept(item)}
          disabled={respondingId === item.id}
        >
          {respondingId === item.id
            ? <ActivityIndicator color={COLORS.text.inverse} size="small" />
            : <Text style={styles.acceptTxt}>✓ Accept Job</Text>
          }
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />
      <View style={styles.header}>
        <Text style={styles.title}>Job Opportunities</Text>
        {opps.length > 0 && (
          <View style={styles.countBadge}><Text style={styles.countText}>{opps.length}</Text></View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.brand.primary} style={{ marginTop: 60 }} size="large" />
      ) : (
        <FlatList
          data={opps}
          renderItem={renderOpp}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); loadOpportunities(); }}
              tintColor={COLORS.brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>New opportunities will appear here</Text>
              {acceptedCount > 0 && (
                <Text style={styles.acceptedCount}>{acceptedCount} job(s) accepted today</Text>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.text.primary, flex: 1 },
  countBadge: { backgroundColor: COLORS.error, borderRadius: RADIUS.full, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  countText: { color: COLORS.text.inverse, fontSize: FONT.size.sm, fontWeight: FONT.weight.bold },
  list: { padding: SPACING.lg },
  card: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1.5, borderColor: COLORS.brand.primary + '30', ...SHADOW.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  service: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary, textTransform: 'capitalize', flex: 1 },
  matchBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  matchText: { fontSize: FONT.size.xs, fontWeight: FONT.weight.bold },
  issue: { fontSize: FONT.size.sm, color: COLORS.text.secondary, fontStyle: 'italic', marginBottom: SPACING.md, lineHeight: 18 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
  meta: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  timerRow: { borderWidth: 1, borderRadius: RADIUS.sm, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, marginBottom: SPACING.md, alignSelf: 'flex-start' },
  timerText: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold },
  actions: { flexDirection: 'row', gap: SPACING.md },
  declineBtn: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.error, paddingVertical: SPACING.md, alignItems: 'center' },
  declineTxt: { color: COLORS.error, fontWeight: FONT.weight.semibold },
  acceptBtn: { flex: 2, borderRadius: RADIUS.md, backgroundColor: COLORS.brand.primary, paddingVertical: SPACING.md, alignItems: 'center', ...SHADOW.brand },
  acceptTxt: { color: COLORS.text.inverse, fontWeight: FONT.weight.bold, fontSize: FONT.size.md },
  btnDisabled: { opacity: 0.6 },
  empty: { alignItems: 'center', paddingTop: SPACING.xxxl * 2, gap: SPACING.md },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  emptySubtitle: { fontSize: FONT.size.md, color: COLORS.text.secondary },
  acceptedCount: { fontSize: FONT.size.md, color: COLORS.success, fontWeight: FONT.weight.semibold },
});
