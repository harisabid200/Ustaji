// ProviderDashboardScreen — Provider home
// Shows real profile data from context + live opportunities
import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView,
  StatusBar, ScrollView, Switch, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../../theme';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';

export default function ProviderDashboardScreen({ navigation }: any) {
  const { user } = useApp();
  const [isOnline, setIsOnline] = useState(false); // Offline by default on first load
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [hasLoadedOpps, setHasLoadedOpps] = useState(false);

  // Pull stats from provider profile in context (populated during onboarding)
  const profile = user?.providerProfile;

  // Today's stats — start at zero for new providers
  const [todayStats, setTodayStats] = useState({ jobs: 0, earnings: 0 });

  useEffect(() => { loadOpportunities(); }, []);

  const loadOpportunities = async () => {
    try {
      const opps = await apiService.getOpportunities(user?.id ?? '');
      // Only show opportunities matching provider's services
      const filtered = profile?.serviceTypes
        ? opps.filter(o => profile.serviceTypes.includes(o.service_type))
        : opps;
      setOpportunities(filtered);
    } catch {
      // Server not running — show empty state cleanly
      setOpportunities([]);
    } finally {
      setHasLoadedOpps(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOpportunities();
    setIsRefreshing(false);
  };

  const handleAccept = (id: string) => {
    setOpportunities(prev => prev.filter(o => o.id !== id));
    setTodayStats(prev => ({ jobs: prev.jobs + 1, earnings: prev.earnings + 3500 }));
  };

  const handleDecline = (id: string) => {
    setOpportunities(prev => prev.filter(o => o.id !== id));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // First name for greeting
  const firstName = user?.name?.split(' ')[0] ?? 'Provider';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.brand.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Salam,</Text>
            <Text style={styles.providerName}>{firstName} 👷</Text>
            {profile?.area && <Text style={styles.providerArea}>📍 {profile.area}</Text>}
          </View>
          <View style={styles.onlineRow}>
            <Text style={[styles.onlineLabel, { color: isOnline ? COLORS.success : COLORS.text.secondary }]}>
              {isOnline ? '🟢 Online' : '⚫ Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: COLORS.border, true: COLORS.brand.accent }}
              thumbColor={isOnline ? COLORS.brand.primary : COLORS.text.tertiary}
            />
          </View>
        </View>

        {/* Go Online hint for new providers */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              🔔 Toggle Online to start receiving job opportunities in {profile?.area ?? 'your area'}
            </Text>
          </View>
        )}

        {/* Today's Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: COLORS.infoBg }]}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statValue}>{todayStats.jobs}</Text>
            <Text style={styles.statLabel}>Today's Jobs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.successBg }]}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>
              {todayStats.earnings > 0 ? `PKR ${todayStats.earnings.toLocaleString()}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.warningBg }]}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Avg. Rating</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F5F3FF' }]}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={[styles.statValue, { color: '#7C3AED' }]}>New</Text>
            <Text style={styles.statLabel}>Trust Score</Text>
          </View>
        </View>

        {/* Services summary */}
        {profile?.serviceTypes && profile.serviceTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Services</Text>
            <View style={styles.serviceChips}>
              {profile.serviceTypes.map(s => (
                <View key={s} style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>{s.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Incoming Opportunities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔔 Incoming Opportunities</Text>
            {opportunities.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{opportunities.length}</Text>
              </View>
            )}
          </View>

          {!isOnline ? (
            <View style={styles.offlineOpps}>
              <Text style={styles.offlineOppsIcon}>📵</Text>
              <Text style={styles.offlineOppsText}>Go online to receive opportunities</Text>
            </View>
          ) : opportunities.length === 0 && hasLoadedOpps ? (
            <View style={styles.emptyOpps}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No pending opportunities</Text>
              <Text style={styles.emptySubText}>New job requests will appear here</Text>
            </View>
          ) : (
            opportunities.map(opp => (
              <View key={opp.id} style={styles.oppCard}>
                <View style={styles.oppHeader}>
                  <Text style={styles.oppService} numberOfLines={1}>
                    🔧 {(opp.service_type ?? opp.service)?.replace(/_/g, ' ')}
                  </Text>
                  {opp.match_score && (
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchText}>{opp.match_score}% match</Text>
                    </View>
                  )}
                </View>
                <View style={styles.oppMeta}>
                  <Text style={styles.oppMetaText}>📍 {opp.area} ({opp.distance_km ?? opp.distance}km)</Text>
                  <Text style={styles.oppMetaText}>⏰ {opp.urgency}</Text>
                  <Text style={styles.oppMetaText}>
                    💰 Est. PKR {(opp.estimated_price ?? opp.price)?.toLocaleString()}
                  </Text>
                </View>
                {opp.time_limit_seconds && (
                  <Text style={styles.oppTimer}>⏳ Respond in {formatTime(opp.time_limit_seconds)}</Text>
                )}
                <View style={styles.oppActions}>
                  <Pressable style={styles.declineBtn} onPress={() => handleDecline(opp.id)}>
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </Pressable>
                  <Pressable style={styles.acceptBtn} onPress={() => handleAccept(opp.id)}>
                    <Text style={styles.acceptBtnText}>✓ Accept Job</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Nav */}
        <View style={styles.quickNav}>
          <Pressable style={styles.quickNavBtn} onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.quickNavIcon}>📅</Text>
            <Text style={styles.quickNavLabel}>My Schedule</Text>
          </Pressable>
          <Pressable style={styles.quickNavBtn} onPress={() => navigation.navigate('Earnings')}>
            <Text style={styles.quickNavIcon}>📈</Text>
            <Text style={styles.quickNavLabel}>Earnings</Text>
          </Pressable>
        </View>

        <View style={{ height: SPACING.xxxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
  },
  greeting: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  providerName: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary, marginTop: 2 },
  providerArea: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 3 },
  onlineRow: { alignItems: 'center', gap: SPACING.xs },
  onlineLabel: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold },

  offlineBanner: {
    backgroundColor: COLORS.bg.secondary, marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  offlineBannerText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, lineHeight: 20 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg,
    gap: SPACING.sm, marginBottom: SPACING.xl,
  },
  statCard: { width: '47%', borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, minHeight: 96, ...SHADOW.sm },
  statIcon: { fontSize: 24, marginBottom: SPACING.xs },
  statValue: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  statLabel: { fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: 2 },

  section: { marginBottom: SPACING.xl, paddingHorizontal: SPACING.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  badge: { backgroundColor: COLORS.error, borderRadius: RADIUS.full, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: COLORS.text.inverse, fontSize: FONT.size.xs, fontWeight: FONT.weight.bold },

  serviceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  serviceChip: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  serviceChipText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, textTransform: 'capitalize' },

  offlineOpps: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm, backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  offlineOppsIcon: { fontSize: 36 },
  offlineOppsText: { fontSize: FONT.size.md, color: COLORS.text.secondary },

  emptyOpps: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  emptySubText: { fontSize: FONT.size.sm, color: COLORS.text.secondary },

  oppCard: {
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.brand.primary + '40', ...SHADOW.sm,
  },
  oppHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  oppService: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary, textTransform: 'capitalize', flex: 1, flexShrink: 1 },
  matchBadge: { backgroundColor: COLORS.successBg, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  matchText: { fontSize: FONT.size.xs, color: COLORS.success, fontWeight: FONT.weight.bold },
  oppMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.sm },
  oppMetaText: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  oppTimer: { fontSize: FONT.size.sm, color: COLORS.warning, fontWeight: FONT.weight.semibold, marginBottom: SPACING.md },
  oppActions: { flexDirection: 'row', gap: SPACING.md },
  declineBtn: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.error, paddingVertical: SPACING.md, alignItems: 'center' },
  declineBtnText: { color: COLORS.error, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  acceptBtn: { flex: 2, borderRadius: RADIUS.md, backgroundColor: COLORS.brand.primary, paddingVertical: SPACING.md, alignItems: 'center', ...SHADOW.brand },
  acceptBtnText: { color: COLORS.text.inverse, fontSize: FONT.size.md, fontWeight: FONT.weight.bold },

  quickNav: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md },
  quickNavBtn: { flex: 1, backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  quickNavIcon: { fontSize: 28 },
  quickNavLabel: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
});
