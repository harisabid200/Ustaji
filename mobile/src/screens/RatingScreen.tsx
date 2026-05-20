// RatingScreen — Post-service rating
import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView,
  StatusBar, TextInput, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { apiService } from '../services/api';

const CATEGORY_RATINGS = [
  { key: 'quality', label: 'Quality of Work', icon: '⭐' },
  { key: 'punctuality', label: 'Punctuality', icon: '⏰' },
  { key: 'behaviour', label: 'Behaviour', icon: '😊' },
  { key: 'value', label: 'Value for Money', icon: '💰' },
];

export default function RatingScreen({ route, navigation }: any) {
  const { bookingId, providerName } = route.params;
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setCatRating = (key: string, value: number) => {
    setCategoryRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Rating required', 'Please give an overall rating before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiService.submitRating(bookingId, {
        rating: overallRating,
        review: review.trim(),
        category_ratings: categoryRatings,
      });
      Alert.alert('Shukriya! 🙏', 'Aap ka review submit ho gaya. Yeh providers ko behtar banata hai!', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRow = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Pressable key={i} onPress={() => onChange(i)} style={styles.starBtn}>
          <Text style={[styles.star, i <= value && styles.starFilled]}>{i <= value ? '★' : '☆'}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Rate Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Provider info */}
        <View style={styles.providerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(providerName ?? 'P')[0]}</Text>
          </View>
          <View>
            <Text style={styles.providerName}>{providerName}</Text>
            <Text style={styles.providerSub}>How was your experience?</Text>
          </View>
        </View>

        {/* Overall rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          <View style={styles.overallStars}>
            <StarRow value={overallRating} onChange={setOverallRating} />
            {overallRating > 0 && (
              <Text style={styles.ratingLabel}>
                {['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Very Good 😊', 'Excellent! 🤩'][overallRating]}
              </Text>
            )}
          </View>
        </View>

        {/* Category ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Ratings</Text>
          {CATEGORY_RATINGS.map(cat => (
            <View key={cat.key} style={styles.catRow}>
              <Text style={styles.catLabel}>{cat.icon} {cat.label}</Text>
              <StarRow value={categoryRatings[cat.key] ?? 0} onChange={v => setCatRating(cat.key, v)} />
            </View>
          ))}
        </View>

        {/* Written review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Write a Review (optional)</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Service kaisa tha? Doosron ko batayein..."
            placeholderTextColor={COLORS.placeholder}
            value={review}
            onChangeText={setReview}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{review.length}/500</Text>
        </View>

        {/* Submit */}
        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? <ActivityIndicator color={COLORS.text.inverse} />
            : <Text style={styles.submitBtnText}>Submit Review ✓</Text>
          }
        </Pressable>

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.bg.secondary },
  backIcon: { fontSize: 20, color: COLORS.text.primary },
  title: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  scroll: { padding: SPACING.lg },

  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: {
    width: 52, height: 52, borderRadius: RADIUS.full,
    backgroundColor: COLORS.brand.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.inverse },
  providerName: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  providerSub: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 2 },

  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.text.primary, marginBottom: SPACING.md },

  overallStars: { alignItems: 'center', gap: SPACING.sm },
  starRow: { flexDirection: 'row', gap: SPACING.sm },
  starBtn: { padding: SPACING.xs },
  star: { fontSize: 36, color: COLORS.border },
  starFilled: { color: COLORS.warning },
  ratingLabel: { fontSize: FONT.size.md, color: COLORS.text.secondary, fontWeight: FONT.weight.medium },

  catRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  catLabel: { fontSize: FONT.size.md, color: COLORS.text.primary },

  reviewInput: {
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: SPACING.lg, fontSize: FONT.size.md, color: COLORS.text.primary,
    textAlignVertical: 'top', minHeight: 100,
  },
  charCount: { fontSize: FONT.size.xs, color: COLORS.text.tertiary, textAlign: 'right', marginTop: SPACING.xs },

  submitBtn: {
    backgroundColor: COLORS.brand.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOW.brand,
  },
  submitBtnText: { color: COLORS.text.inverse, fontSize: FONT.size.lg, fontWeight: FONT.weight.bold },
});
