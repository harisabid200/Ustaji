// HomeScreen — Main user landing page
// Category cards, search, recent bookings, nearby providers

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';

interface ServiceCategory {
  id: string;
  name: string;
  nameUr: string;
  icon: string;
  providerCount: number;
  color: string;
}

const CATEGORIES: ServiceCategory[] = [
  { id: 'ac_repair', name: 'AC Repair', nameUr: 'اے سی مرمت', icon: '❄️', providerCount: 8, color: '#EFF6FF' },
  { id: 'plumbing', name: 'Plumbing', nameUr: 'پلمبنگ', icon: '🔧', providerCount: 6, color: '#ECFDF5' },
  { id: 'electrical', name: 'Electrical', nameUr: 'بجلی', icon: '⚡', providerCount: 5, color: '#FFFBEB' },
  { id: 'cleaning', name: 'Cleaning', nameUr: 'صفائی', icon: '🧹', providerCount: 4, color: '#F0FDF4' },
  { id: 'carpentry', name: 'Carpentry', nameUr: 'بڑھئی', icon: '🪵', providerCount: 3, color: '#FEF3C7' },
  { id: 'tutoring', name: 'Tutoring', nameUr: 'ٹیوشن', icon: '📚', providerCount: 7, color: '#EDE9FE' },
  { id: 'beauty', name: 'Beauty', nameUr: 'بیوٹی', icon: '💄', providerCount: 4, color: '#FDF2F8' },
  { id: 'mechanic', name: 'Mechanic', nameUr: 'مکینک', icon: '🚗', providerCount: 3, color: '#FFF7ED' },
  { id: 'painting', name: 'Painting', nameUr: 'پینٹنگ', icon: '🎨', providerCount: 2, color: '#F0F9FF' },
  { id: 'driving', name: 'Driver', nameUr: 'ڈرائیور', icon: '🚐', providerCount: 5, color: '#F8FAFC' },
  { id: 'home_appliance', name: 'Appliances', nameUr: 'آلات', icon: '📺', providerCount: 4, color: '#FEF2F2' },
  { id: 'ac_installation', name: 'AC Install', nameUr: 'اے سی لگانا', icon: '🌬️', providerCount: 3, color: '#F0F4FF' },
];

interface RecentBooking {
  id: string;
  service: string;
  providerName: string;
  status: string;
  date: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useApp();
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null); // null = checking

  // Check server reachability first, then load data
  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    const online = await apiService.checkHealth();
    setIsServerOnline(online);
    if (online) loadRecentBookings();
  };

  const loadRecentBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const data = await apiService.getBookings();
      setRecentBookings(
        data.slice(0, 5).map((b: any) => ({
          id: b.id,
          service: b.service_type?.replace('_', ' ') ?? 'Service',
          providerName: b.provider_name ?? 'Provider',
          status: b.status ?? 'pending',
          date: b.scheduled_time?.split(' ')[0] ?? '',
        }))
      );
    } catch {
      setBookingsError('Could not load bookings.');
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  const handleCategoryPress = (category: ServiceCategory) => {
    navigation.navigate('Category', { category });
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      confirmed: COLORS.status.confirmed,
      in_progress: COLORS.status.in_progress,
      completed: COLORS.status.completed,
      cancelled: COLORS.status.cancelled,
      pending: COLORS.status.pending,
    };
    return map[status] ?? COLORS.status.pending;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      pending: 'Pending',
      booked: 'Booked',
    };
    return map[status] ?? status;
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Subah Bakhair 🌅';
    if (hour < 17) return 'Salam 👋';
    return 'Sham Bakhair 🌙';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />

      {/* Offline / degraded banner */}
      {isServerOnline === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️  Server unreachable — browsing in offline mode</Text>
          <Pressable onPress={checkServerHealth} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}
      {isServerOnline === null && (
        <View style={styles.checkingBanner}>
          <ActivityIndicator size="small" color={COLORS.brand.primary} />
          <Text style={styles.checkingText}>  Connecting to server...</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{user?.name ?? 'Guest'} 👋</Text>
          </View>
          <Pressable
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}
            accessibilityLabel="Profile"
          >
            <Text style={styles.profileInitial}>{(user?.name ?? 'G')[0].toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <Pressable onPress={() => navigation.navigate('Chat', {})} style={styles.searchWrap}>
          <View style={styles.searchBar} pointerEvents="none">
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>
              What do you need? (Urdu / English)
            </Text>
          </View>
        </Pressable>

        {/* AI Chat CTA */}
        <Pressable
          style={styles.aiCta}
          onPress={() => navigation.navigate('Chat', {})}
        >
          <View style={styles.aiCtaLeft}>
            <Text style={styles.aiCtaIcon}>🤖</Text>
            <View style={styles.aiCtaTextBlock}>
              <Text style={styles.aiCtaTitle} numberOfLines={1}>Chat with UstaJi AI</Text>
              <Text style={styles.aiCtaSubtitle} numberOfLines={2}>Describe your problem — we'll find the best match</Text>
            </View>
          </View>
          <Text style={styles.aiCtaArrow}>→</Text>
        </Pressable>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={[styles.categoryCard, { backgroundColor: cat.color }]}
                onPress={() => handleCategoryPress(cat)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryCount}>{cat.providerCount} providers</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Bookings */}
        {(recentBookings.length > 0 || isLoadingBookings) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Bookings</Text>
              <Pressable onPress={() => navigation.navigate('Bookings')}>
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>

            {isLoadingBookings ? (
              <ActivityIndicator color={COLORS.brand.primary} style={{ marginTop: SPACING.md }} />
            ) : bookingsError ? (
              <View style={styles.errorRow}>
                <Text style={styles.errorText}>{bookingsError}</Text>
                <Pressable onPress={loadRecentBookings} style={styles.retryBtn}>
                  <Text style={styles.retryText}>↩ Retry</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingsScroll}>
                {recentBookings.map((b) => (
                  <Pressable
                    key={b.id}
                    style={styles.bookingCard}
                    onPress={() => navigation.navigate('BookingDetail', { bookingId: b.id })}
                  >
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(b.status) }]} />
                    <Text style={styles.bookingService} numberOfLines={1}>{b.service}</Text>
                    <Text style={styles.bookingProvider} numberOfLines={1}>{b.providerName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(b.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(b.status) }]} numberOfLines={1}>
                        {getStatusLabel(b.status)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: SPACING.xxxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_WIDTH = 160;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
  },
  greeting: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  userName: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary, marginTop: 2 },
  profileBtn: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    backgroundColor: COLORS.brand.primary,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.brand,
  },
  profileInitial: { color: COLORS.text.inverse, fontSize: FONT.size.lg, fontWeight: FONT.weight.bold },

  searchWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    ...SHADOW.sm,
  },
  searchIcon: { fontSize: 18 },
  searchPlaceholder: { fontSize: FONT.size.md, color: COLORS.placeholder, flex: 1 },

  aiCta: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.xl,
    backgroundColor: COLORS.brand.amberLight,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.brand.amberBorder,
  },
  aiCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1, overflow: 'hidden' },
  aiCtaTextBlock: { flex: 1, flexShrink: 1 },
  aiCtaIcon: { fontSize: 28 },
  aiCtaTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  aiCtaSubtitle: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 2, flexWrap: 'wrap' },
  aiCtaArrow: { fontSize: FONT.size.xl, color: COLORS.brand.amber, fontWeight: FONT.weight.bold },

  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  seeAll: { fontSize: FONT.size.sm, color: COLORS.brand.primary, fontWeight: FONT.weight.medium },

  categoriesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg, gap: SPACING.sm,
  },
  categoryCard: {
    width: '47%', borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  categoryIcon: { fontSize: 30, marginBottom: SPACING.sm },
  categoryName: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  categoryCount: { fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: 2 },

  bookingsScroll: { paddingLeft: SPACING.lg },
  bookingCard: {
    width: CARD_WIDTH, backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginRight: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: RADIUS.full, marginBottom: SPACING.sm },
  bookingService: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary, textTransform: 'capitalize' },
  bookingProvider: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 2, marginBottom: SPACING.sm },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold },

  // ── Offline / error banners ────────────────────────────────────
  offlineBanner: {
    backgroundColor: COLORS.warningBg,
    borderBottomWidth: 1, borderBottomColor: COLORS.warning + '50',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  offlineText: { fontSize: FONT.size.sm, color: COLORS.warning, flex: 1 },
  checkingBanner: {
    backgroundColor: COLORS.infoBg,
    borderBottomWidth: 1, borderBottomColor: COLORS.info + '30',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  checkingText: { fontSize: FONT.size.sm, color: COLORS.info },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  errorText: { fontSize: FONT.size.sm, color: COLORS.error, flex: 1 },
  retryBtn: {
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  retryText: { fontSize: FONT.size.sm, color: COLORS.text.inverse, fontWeight: FONT.weight.semibold },
});
