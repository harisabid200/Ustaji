// CategoryScreen — Provider list for a service category
// Option C: Provider list + floating "Chat with UstaJi" button

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { apiService } from '../services/api';

interface Provider {
  id: string;
  name: string;
  service_types: string[];
  rating: number;
  area: string;
  verified: boolean;
  base_rate?: number;
  distance_km?: number;
  trust_score?: number;
}

type SortKey = 'rating' | 'distance' | 'price';

export default function CategoryScreen({ route, navigation }: any) {
  const { category } = route.params;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filtered, setFiltered] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('rating');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [providers, sortBy, searchText]);

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const all = await apiService.getProviders();
      const relevant = all.filter((p: Provider) =>
        p.service_types?.includes(category.id)
      );
      setProviders(relevant);
    } catch {
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let list = [...providers];

    if (searchText.trim()) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(searchText.toLowerCase()) ||
        p.area?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'distance') return (a.distance_km ?? 99) - (b.distance_km ?? 99);
      if (sortBy === 'price') return (a.base_rate ?? 9999) - (b.base_rate ?? 9999);
      return 0;
    });

    setFiltered(list);
  }, [providers, sortBy, searchText]);

  const getTrustColor = (score: number) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    return COLORS.error;
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  const renderProvider = ({ item }: { item: Provider }) => {
    const trustScore = item.trust_score ?? Math.round(60 + item.rating * 8);
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('ProviderProfile', { providerId: item.id })}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{item.name[0].toUpperCase()}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.providerName}>{item.name}</Text>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(item.rating)}</Text>
            <Text style={styles.ratingText}>{item.rating?.toFixed(1)}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>📍 {item.area ?? 'Islamabad'}</Text>
            {item.base_rate && (
              <Text style={styles.metaText}>💰 From PKR {item.base_rate?.toLocaleString()}</Text>
            )}
          </View>
        </View>

        {/* Trust Score */}
        <View style={styles.trustWrap}>
          <Text style={[styles.trustScore, { color: getTrustColor(trustScore) }]}>{trustScore}</Text>
          <Text style={styles.trustLabel}>Trust</Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  };

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'rating', label: 'Top Rated' },
    { key: 'distance', label: 'Nearest' },
    { key: 'price', label: 'Cheapest' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.categoryEmoji}>{category.icon}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.providerCountText}>{filtered.length} providers available</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or area..."
            placeholderTextColor={COLORS.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Sort tabs */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map(opt => (
          <Pressable
            key={opt.key}
            style={[styles.sortBtn, sortBy === opt.key && styles.sortBtnActive]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text style={[styles.sortBtnText, sortBy === opt.key && styles.sortBtnTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Provider list */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.brand.primary} />
          <Text style={styles.loadingText}>Finding providers...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderProvider}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>{category.icon}</Text>
              <Text style={styles.emptyTitle}>No providers found</Text>
              <Text style={styles.emptySubtitle}>Try chatting with UstaJi for alternatives</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Chat CTA — Option C */}
      <View style={styles.floatingCta}>
        <Pressable
          style={styles.floatingBtn}
          onPress={() => navigation.navigate('UserMain', {
            screen: 'Chat',
            params: {
              prefillMessage: `I'm looking for ${category.name} services`,
              category: category.id,
            },
          })}
        >
          <Text style={styles.floatingBtnIcon}>💬</Text>
          <Text style={styles.floatingBtnText}>Chat with UstaJi for personalized help</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg.primary,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.bg.secondary },
  backIcon: { fontSize: 20, color: COLORS.text.primary },
  categoryEmoji: { fontSize: 32 },
  headerText: { flex: 1 },
  categoryName: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  providerCountText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 2 },

  searchRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: FONT.size.md, color: COLORS.text.primary },

  sortRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  sortBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.bg.secondary,
  },
  sortBtnActive: { backgroundColor: COLORS.brand.primary, borderColor: COLORS.brand.primary },
  sortBtnText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, fontWeight: FONT.weight.medium },
  sortBtnTextActive: { color: COLORS.text.inverse },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText: { color: COLORS.text.secondary, fontSize: FONT.size.md },

  listContent: { padding: SPACING.lg, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bg.primary,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  avatar: {
    width: 52, height: 52, borderRadius: RADIUS.full,
    backgroundColor: COLORS.brand.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.inverse },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 3 },
  providerName: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  verifiedBadge: {
    backgroundColor: COLORS.successBg ?? '#ECFDF5',
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.xs, paddingVertical: 2,
  },
  verifiedText: { fontSize: FONT.size.xs, color: COLORS.success, fontWeight: FONT.weight.medium },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  stars: { fontSize: FONT.size.sm, color: COLORS.warning },
  ratingText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, fontWeight: FONT.weight.medium },
  metaRow: { flexDirection: 'row', gap: SPACING.md },
  metaText: { fontSize: FONT.size.xs, color: COLORS.text.tertiary },

  trustWrap: { alignItems: 'center', marginRight: SPACING.xs },
  trustScore: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold },
  trustLabel: { fontSize: FONT.size.xs, color: COLORS.text.tertiary },

  chevron: { fontSize: 22, color: COLORS.text.tertiary, marginLeft: -SPACING.xs },

  emptyWrap: { alignItems: 'center', paddingTop: SPACING.xxxl * 2, gap: SPACING.md },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  emptySubtitle: { fontSize: FONT.size.md, color: COLORS.text.secondary, textAlign: 'center' },

  floatingCta: {
    position: 'absolute', bottom: SPACING.xl, left: SPACING.lg, right: SPACING.lg,
  },
  floatingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.xl, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xl,
    ...SHADOW.brand,
  },
  floatingBtnIcon: { fontSize: 20 },
  floatingBtnText: { color: COLORS.text.inverse, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, flex: 1 },
});
