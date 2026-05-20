// OpportunityScreen — Provider incoming job requests
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../../theme';

const MOCK_OPPS = [
  { id: 'o1', service: 'AC Repair', area: 'G-13', distance: '0.8km', price: 3500, urgency: 'Today, Morning', matchScore: 94, user: 'Ali R.', issue: 'AC not cooling properly, gas refill needed', timeLeft: 115 },
  { id: 'o2', service: 'AC Installation', area: 'F-8', distance: '2.1km', price: 5500, urgency: 'Tomorrow, Afternoon', matchScore: 87, user: 'Sara K.', issue: 'New split AC installation (1.5 ton)', timeLeft: 280 },
  { id: 'o3', service: 'AC Repair', area: 'G-11', distance: '1.3km', price: 2800, urgency: 'Today, Evening', matchScore: 79, user: 'Usman T.', issue: 'AC making loud noise', timeLeft: 60 },
];

export default function OpportunityScreen() {
  const [opps, setOpps] = useState(MOCK_OPPS);
  const [accepted, setAccepted] = useState<string[]>([]);

  const handleAccept = (id: string) => {
    setAccepted(prev => [...prev, id]);
    setOpps(prev => prev.filter(o => o.id !== id));
  };
  const handleDecline = (id: string) => setOpps(prev => prev.filter(o => o.id !== id));

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const renderOpp = ({ item }: { item: typeof MOCK_OPPS[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.service}>🔧 {item.service}</Text>
        <View style={[styles.matchBadge, { backgroundColor: item.matchScore >= 90 ? COLORS.successBg : COLORS.warningBg }]}>
          <Text style={[styles.matchText, { color: item.matchScore >= 90 ? COLORS.success : COLORS.warning }]}>
            {item.matchScore}% match
          </Text>
        </View>
      </View>

      <Text style={styles.issue}>"{item.issue}"</Text>

      <View style={styles.metaGrid}>
        <Text style={styles.meta}>👤 {item.user}</Text>
        <Text style={styles.meta}>📍 {item.area} ({item.distance})</Text>
        <Text style={styles.meta}>⏰ {item.urgency}</Text>
        <Text style={styles.meta}>💰 Est. Rs. {item.price.toLocaleString()}</Text>
      </View>

      <View style={styles.timerRow}>
        <Text style={styles.timerText}>⏳ Respond within {formatTimer(item.timeLeft)}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.declineBtn} onPress={() => handleDecline(item.id)}>
          <Text style={styles.declineTxt}>✗ Decline</Text>
        </Pressable>
        <Pressable style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
          <Text style={styles.acceptTxt}>✓ Accept Job</Text>
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
      <FlatList
        data={opps}
        renderItem={renderOpp}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>New opportunities will appear here</Text>
            {accepted.length > 0 && <Text style={styles.acceptedCount}>{accepted.length} job(s) accepted today</Text>}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
  service: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  matchBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  matchText: { fontSize: FONT.size.xs, fontWeight: FONT.weight.bold },
  issue: { fontSize: FONT.size.sm, color: COLORS.text.secondary, fontStyle: 'italic', marginBottom: SPACING.md, lineHeight: 18 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
  meta: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  timerRow: { backgroundColor: COLORS.warningBg, borderRadius: RADIUS.sm, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, marginBottom: SPACING.md, alignSelf: 'flex-start' },
  timerText: { fontSize: FONT.size.sm, color: COLORS.warning, fontWeight: FONT.weight.semibold },
  actions: { flexDirection: 'row', gap: SPACING.md },
  declineBtn: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.error, paddingVertical: SPACING.md, alignItems: 'center' },
  declineTxt: { color: COLORS.error, fontWeight: FONT.weight.semibold },
  acceptBtn: { flex: 2, borderRadius: RADIUS.md, backgroundColor: COLORS.brand.primary, paddingVertical: SPACING.md, alignItems: 'center', ...SHADOW.brand },
  acceptTxt: { color: COLORS.text.inverse, fontWeight: FONT.weight.bold, fontSize: FONT.size.md },
  empty: { alignItems: 'center', paddingTop: SPACING.xxxl * 2, gap: SPACING.md },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  emptySubtitle: { fontSize: FONT.size.md, color: COLORS.text.secondary },
  acceptedCount: { fontSize: FONT.size.md, color: COLORS.success, fontWeight: FONT.weight.semibold },
});
