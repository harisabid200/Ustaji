// ProviderProfileScreen — Full provider profile with trust score
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { apiService } from '../services/api';

export default function ProviderProfileScreen({ route, navigation }: any) {
  const { providerId } = route.params;
  const [provider, setProvider] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await apiService.getProviderById(providerId);
      setProvider(data);
    } catch { navigation.goBack(); }
    finally { setIsLoading(false); }
  };

  if (isLoading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.brand.primary} /></View></SafeAreaView>;
  if (!provider) return null;

  const trustScore = provider.trust_score ?? Math.round(60 + (provider.stats?.avg_rating ?? 4) * 8);
  const trustColor = trustScore >= 80 ? COLORS.success : trustScore >= 60 ? COLORS.warning : COLORS.error;

  const renderStars = (r: number) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backIcon}>←</Text></Pressable>
        <Text style={styles.headerTitle}>Provider Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}><Text style={styles.avatarInitial}>{provider.name?.[0]}</Text></View>
          <Text style={styles.name}>{provider.name}</Text>
          <Text style={styles.area}>📍 {provider.location?.area ?? 'Islamabad'}</Text>
          {provider.verified && <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified Provider</Text></View>}
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(provider.stats?.avg_rating ?? 4)}</Text>
            <Text style={styles.ratingText}>{(provider.stats?.avg_rating ?? 4).toFixed(1)} ({provider.stats?.rating_count ?? 0} reviews)</Text>
          </View>
        </View>

        {/* Trust Score */}
        <View style={styles.trustSection}>
          <View style={[styles.trustCircle, { borderColor: trustColor }]}>
            <Text style={[styles.trustScore, { color: trustColor }]}>{trustScore}</Text>
            <Text style={styles.trustLabel}>Trust Score</Text>
          </View>
          <View style={styles.statsGrid}>
            {[
              ['📋', `${provider.stats?.total_jobs ?? 0}`, 'Total Jobs'],
              ['⏰', `${provider.stats?.on_time_percentage ?? 0}%`, 'On Time'],
              ['❌', `${provider.stats?.cancellation_rate ?? 0}%`, 'Cancellation'],
              ['⭐', `${(provider.stats?.avg_rating ?? 0).toFixed(1)}`, 'Avg Rating'],
            ].map(([icon, val, label]) => (
              <View key={label} style={styles.statItem}>
                <Text style={styles.statIcon}>{icon}</Text>
                <Text style={styles.statVal}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bio */}
        {provider.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{provider.bio}</Text>
          </View>
        )}

        {/* Services & Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.tagRow}>
            {(provider.service_types ?? []).map((s: string) => (
              <View key={s} style={styles.tag}><Text style={styles.tagText}>{s.replace(/_/g, ' ')}</Text></View>
            ))}
          </View>
          {provider.certifications?.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Certifications</Text>
              {provider.certifications.map((c: string) => (
                <Text key={c} style={styles.certText}>🏅 {c}</Text>
              ))}
            </>
          )}
        </View>

        {/* Reviews */}
        {provider.reviews?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {provider.reviews.slice(0, 3).map((r: any) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewer}>{r.user_name}</Text>
                  <Text style={styles.reviewStars}>{renderStars(r.rating)}</Text>
                </View>
                <Text style={styles.reviewText}>{r.text}</Text>
                <Text style={styles.reviewDate}>{r.created_at}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Book Now */}
        <View style={styles.bookingSection}>
          <Pressable
            style={styles.bookBtn}
            onPress={() => navigation.navigate('Chat', {
              prefillMessage: `I want to book ${provider.name} for ${provider.service_types?.[0]?.replace(/_/g, ' ')}`,
            })}
          >
            <Text style={styles.bookBtnText}>📅 Book via Chat</Text>
          </Pressable>
        </View>

        <View style={{ height: SPACING.xxxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.bg.secondary },
  backIcon: { fontSize: 20 },
  headerTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  hero: { alignItems: 'center', padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm },
  avatar: { width: 88, height: 88, borderRadius: RADIUS.full, backgroundColor: COLORS.brand.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.brand },
  avatarInitial: { fontSize: FONT.size.xxxl, fontWeight: FONT.weight.bold, color: COLORS.text.inverse },
  name: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  area: { fontSize: FONT.size.md, color: COLORS.text.secondary },
  verifiedBadge: { backgroundColor: COLORS.successBg, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.success + '40' },
  verifiedText: { color: COLORS.success, fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stars: { fontSize: FONT.size.lg, color: COLORS.warning },
  ratingText: { fontSize: FONT.size.md, color: COLORS.text.secondary },
  trustSection: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  trustCircle: { width: 80, height: 80, borderRadius: RADIUS.full, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  trustScore: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold },
  trustLabel: { fontSize: FONT.size.xs, color: COLORS.text.secondary },
  statsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  statItem: { alignItems: 'center', minWidth: 60 },
  statIcon: { fontSize: 18 },
  statVal: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  statLabel: { fontSize: FONT.size.xs, color: COLORS.text.tertiary, textAlign: 'center' },
  section: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.text.primary, marginBottom: SPACING.sm },
  bioText: { fontSize: FONT.size.md, color: COLORS.text.secondary, lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tag: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, textTransform: 'capitalize' },
  certText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 3 },
  reviewCard: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  reviewer: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  reviewStars: { fontSize: FONT.size.sm, color: COLORS.warning },
  reviewText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, lineHeight: 20 },
  reviewDate: { fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xs },
  bookingSection: { padding: SPACING.lg },
  bookBtn: { backgroundColor: COLORS.brand.primary, borderRadius: RADIUS.md, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOW.brand },
  bookBtnText: { color: COLORS.text.inverse, fontSize: FONT.size.lg, fontWeight: FONT.weight.bold },
});
