// BookingsScreen — Active / Past / Cancelled tabs
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { apiService } from '../services/api';
import { useApp } from '../context/AppContext';

type TabKey = 'active' | 'past' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['pending', 'confirmed', 'provider_en_route', 'in_progress', 'booked'];
const PAST_STATUSES = ['completed', 'rated'];
const CANCELLED_STATUSES = ['cancelled', 'disputed'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Pending',       color: COLORS.warning,   bg: COLORS.warningBg  },
  confirmed:         { label: 'Confirmed',      color: COLORS.info,      bg: COLORS.infoBg     },
  provider_en_route: { label: 'On the way',     color: COLORS.info,      bg: COLORS.infoBg     },
  in_progress:       { label: 'In Progress',    color: '#8B5CF6',        bg: '#F5F3FF'         },
  delayed:           { label: 'Delayed ⏰',      color: COLORS.warning,   bg: COLORS.warningBg  },
  booked:            { label: 'Booked',         color: COLORS.info,      bg: COLORS.infoBg     },
  completed:         { label: 'Completed',      color: COLORS.success,   bg: COLORS.successBg  },
  rated:             { label: 'Rated ⭐',        color: COLORS.success,   bg: COLORS.successBg  },
  cancelled:         { label: 'Cancelled',      color: COLORS.error,     bg: COLORS.errorBg    },
  disputed:          { label: 'Disputed',       color: COLORS.error,     bg: COLORS.errorBg    },
};

const SERVICE_ICONS: Record<string, string> = {
  ac_repair: '❄️', ac_installation: '🌬️', plumbing: '🔧', electrical: '⚡',
  carpentry: '🪵', painting: '🎨', cleaning: '🧹', tutoring: '📚',
  beauty: '💄', driving: '🚐', mechanic: '🚗', home_appliance: '📺',
};

export default function BookingsScreen({ navigation }: any) {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true); else setIsLoading(true);
    try {
      // Use real user ID — new users will get an empty list, not demo data
      const data = await apiService.getBookings(user?.id ?? 'demo-user');
      setAllBookings(Array.isArray(data) ? data : []);
    } catch { setAllBookings([]); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, []);

  const filtered = allBookings.filter(b => {
    if (activeTab === 'active') return ACTIVE_STATUSES.includes(b.status);
    if (activeTab === 'past') return PAST_STATUSES.includes(b.status);
    return CANCELLED_STATUSES.includes(b.status);
  });

  const renderBooking = ({ item }: { item: any }) => {
    const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, color: COLORS.text.secondary, bg: COLORS.bg.secondary };
    const icon = SERVICE_ICONS[item.service_type] ?? '🔧';
    const canRate = item.status === 'completed';

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
      >
        <View style={styles.cardTop}>
          <View style={[styles.serviceIcon, { backgroundColor: cfg.bg }]}>
            <Text style={styles.serviceEmoji}>{icon}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.serviceType}>
              {item.service_type?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </Text>
            <Text style={styles.providerName}>👨‍🔧 {item.provider_name ?? 'Provider TBD'}</Text>
            {item.scheduled_time && (
              <Text style={styles.meta}>📅 {item.scheduled_time}</Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {item.price?.quoted && (
              <Text style={styles.price}>Rs. {item.price.quoted?.toLocaleString()}</Text>
            )}
          </View>
        </View>

        {canRate && (
          <Pressable
            style={styles.rateBtn}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('Rating', { bookingId: item.id, providerName: item.provider_name });
            }}
          >
            <Text style={styles.rateBtnText}>⭐ Rate this service</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />

      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderBooking}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={COLORS.brand.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'active' ? 'Book a service to get started!' : 'Your completed bookings will appear here'}
              </Text>
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
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },

  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
  },
  tab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.brand.primary },
  tabText: { fontSize: FONT.size.md, color: COLORS.text.secondary, fontWeight: FONT.weight.medium },
  tabTextActive: { color: COLORS.brand.primary, fontWeight: FONT.weight.bold },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.lg },

  card: {
    backgroundColor: COLORS.bg.primary, borderRadius: RADIUS.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, padding: SPACING.lg },
  serviceIcon: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  serviceEmoji: { fontSize: 24 },
  cardBody: { flex: 1, gap: 3 },
  serviceType: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  providerName: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  meta: { fontSize: FONT.size.xs, color: COLORS.text.tertiary },
  cardRight: { alignItems: 'flex-end', gap: SPACING.sm },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusText: { fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold },
  price: { fontSize: FONT.size.sm, fontWeight: FONT.weight.bold, color: COLORS.text.primary },

  rateBtn: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  rateBtnText: { fontSize: FONT.size.sm, color: COLORS.brand.primary, fontWeight: FONT.weight.semibold },

  empty: { alignItems: 'center', paddingTop: SPACING.xxxl * 2, gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  emptySubtitle: { fontSize: FONT.size.md, color: COLORS.text.secondary, textAlign: 'center' },
});
