// ProviderScheduleScreen — Calendar view of upcoming jobs + status updates + delay reporting
import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../../theme';
import { apiService } from '../../services/api';

const STATUS_FLOW = ['confirmed', 'provider_en_route', 'in_progress', 'completed'];
const STATUS_LABELS: Record<string, string> = {
  confirmed: '✅ Confirmed',
  provider_en_route: '🚗 En Route',
  in_progress: '🔧 In Progress',
  completed: '🎉 Completed',
};
const STATUS_COLORS: Record<string, string> = {
  confirmed: COLORS.info,
  provider_en_route: COLORS.warning,
  in_progress: '#8B5CF6',
  completed: COLORS.success,
};

const MOCK_JOBS = [
  { id: 'j1', service: 'AC Repair', client: 'Ali R.', area: 'G-13', time: '10:00 AM', duration: '1-2 hrs', price: 3500, status: 'confirmed' },
  { id: 'j2', service: 'AC Gas Refill', client: 'Sara K.', area: 'F-10', time: '2:00 PM', duration: '45 min', price: 3200, status: 'in_progress' },
  { id: 'j3', service: 'AC Installation', client: 'Ahmed T.', area: 'G-11', time: 'Tomorrow, 11:00 AM', duration: '2-3 hrs', price: 5500, status: 'confirmed' },
];

const DELAY_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
];

export default function ProviderScheduleScreen() {
  const [jobs, setJobs] = useState(MOCK_JOBS);

  const handleUpdateStatus = (id: string, currentStatus: string) => {
    const currentIdx = STATUS_FLOW.indexOf(currentStatus);
    if (currentIdx === STATUS_FLOW.length - 1) {
      Alert.alert('Job Complete', 'This job is already completed.');
      return;
    }
    const nextStatus = STATUS_FLOW[currentIdx + 1];
    Alert.alert(
      'Update Status',
      `Mark as "${STATUS_LABELS[nextStatus]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => setJobs(prev => prev.map(j => j.id === id ? { ...j, status: nextStatus } : j)) },
      ]
    );
  };

  /**
   * Provider reports they need more time — delay options prompt.
   * Calls the backend which:
   *  1. Records the delay on the current booking
   *  2. Pushes the next booking's scheduled_time by delay_minutes
   *  3. Adds a push notification record for the next user
   */
  const handleReportDelay = (jobId: string, clientName: string) => {
    Alert.alert(
      '⚠️ Running Late?',
      `How much extra time do you need for ${clientName}'s job?`,
      [
        ...DELAY_OPTIONS.map(opt => ({
          text: opt.label,
          onPress: () => confirmDelay(jobId, opt.minutes, opt.label),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const confirmDelay = (jobId: string, minutes: number, label: string) => {
    Alert.alert(
      'Add a reason?',
      'This will be shared with the next client.',
      [
        {
          text: 'Skip reason',
          onPress: () => submitDelay(jobId, minutes, label, 'Current job taking longer than expected'),
        },
        {
          text: 'Job more complex',
          onPress: () => submitDelay(jobId, minutes, label, 'Job is more complex than initially estimated'),
        },
        {
          text: 'Parts/materials delay',
          onPress: () => submitDelay(jobId, minutes, label, 'Waiting for parts or materials'),
        },
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const submitDelay = async (jobId: string, minutes: number, label: string, reason: string) => {
    try {
      await apiService.reportDelay(jobId, minutes, reason);
      Alert.alert(
        '✅ Next Client Notified',
        `The next client has been automatically notified:\n\n"Your provider is running ${label} late. Your appointment has been rescheduled. Reason: ${reason}"\n\nNo action needed from you.`
      );
    } catch {
      // Server may not be running — show demo alert
      Alert.alert(
        '✅ Next Client Notified (Demo)',
        `In production:\n• Next booking automatically pushed by ${label}\n• Client receives push notification with new arrival time\n• Reason shown: "${reason}"\n• Provider's on-time % updated for Trust Score`
      );
    }
  };

  const renderJob = ({ item }: { item: typeof MOCK_JOBS[0] }) => {
    const color = STATUS_COLORS[item.status] ?? COLORS.info;
    const isActive = ['provider_en_route', 'in_progress'].includes(item.status);
    const isComplete = item.status === 'completed';
    const canReportDelay = item.status === 'in_progress'; // Only on active job

    return (
      <View style={[styles.card, isActive && styles.cardActive]}>
        <View style={styles.timeCol}>
          <Text style={styles.time}>{item.time.split(',')[0]}</Text>
          {item.time.includes(',') && <Text style={styles.timeDay}>Tomorrow</Text>}
          <Text style={styles.duration}>{item.duration}</Text>
        </View>
        <View style={[styles.timeline, { backgroundColor: color }]} />
        <View style={styles.jobInfo}>
          <Text style={styles.service}>{item.service}</Text>
          <Text style={styles.client}>👤 {item.client}</Text>
          <Text style={styles.area}>📍 {item.area}</Text>
          <Text style={styles.price}>Rs. {item.price.toLocaleString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[item.status]}</Text>
          </View>
          <View style={styles.actionRow}>
            {!isComplete && (
              <Pressable
                style={[styles.updateBtn, { borderColor: color }]}
                onPress={() => handleUpdateStatus(item.id, item.status)}
              >
                <Text style={[styles.updateBtnText, { color }]}>Update Status →</Text>
              </Pressable>
            )}
            {/* Running Late button — only shows on the actively in-progress job */}
            {canReportDelay && (
              <Pressable
                style={styles.lateBtn}
                onPress={() => handleReportDelay(item.id, item.client)}
              >
                <Text style={styles.lateBtnText}>⏰ Running Late</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          ⏰ Running late? Tap "Running Late" on your active job — the next client will be automatically notified.
        </Text>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No jobs scheduled</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  subtitle: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 3 },

  infoBanner: {
    backgroundColor: COLORS.brand.amberLight,
    borderBottomWidth: 1, borderBottomColor: COLORS.brand.amberBorder,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  infoBannerText: { fontSize: FONT.size.sm, color: '#92400E', lineHeight: 18 },

  list: { padding: SPACING.lg },
  card: {
    flexDirection: 'row', gap: SPACING.md,
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  cardActive: { borderColor: COLORS.brand.primary, backgroundColor: COLORS.successBg ?? '#ECFDF5' },

  timeCol: { width: 72, alignItems: 'center', gap: 3 },
  time: { fontSize: FONT.size.sm, fontWeight: FONT.weight.bold, color: COLORS.text.primary, textAlign: 'center' },
  timeDay: { fontSize: FONT.size.xs, color: COLORS.text.secondary },
  duration: { fontSize: FONT.size.xs, color: COLORS.text.tertiary, textAlign: 'center' },

  timeline: { width: 3, borderRadius: RADIUS.full },

  jobInfo: { flex: 1, gap: 4 },
  service: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  client: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  area: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  price: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.brand.secondary },

  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 3 },
  statusText: { fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold },

  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs, flexWrap: 'wrap' },

  updateBtn: {
    borderWidth: 1.5, borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm,
  },
  updateBtnText: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold },

  lateBtn: {
    borderWidth: 1.5, borderRadius: RADIUS.sm, borderColor: COLORS.warning,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.warningBg,
  },
  lateBtnText: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.warning },

  empty: { alignItems: 'center', paddingTop: SPACING.xxxl * 2, gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
});
