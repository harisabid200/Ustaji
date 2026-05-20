// ProviderOnboardingScreen — Multi-step wizard for new providers
// Steps: 1) Services  2) Location & Experience  3) Rates & Availability  4) Done
import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { useApp, ProviderProfile } from '../context/AppContext';

// ─── Data ────────────────────────────────────────────────────
const ALL_SERVICES = [
  { id: 'ac_repair',        label: 'AC Repair',           icon: '❄️' },
  { id: 'ac_installation',  label: 'AC Installation',     icon: '🌬️' },
  { id: 'plumbing',         label: 'Plumbing',            icon: '🔧' },
  { id: 'electrical',       label: 'Electrical',          icon: '⚡' },
  { id: 'carpentry',        label: 'Carpentry',           icon: '🪵' },
  { id: 'painting',         label: 'Painting',            icon: '🎨' },
  { id: 'cleaning',         label: 'Cleaning',            icon: '🧹' },
  { id: 'home_appliance',   label: 'Appliance Repair',    icon: '📺' },
  { id: 'mechanic',         label: 'Auto Mechanic',       icon: '🚗' },
  { id: 'tutoring',         label: 'Tutoring',            icon: '📚' },
];

const CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad'];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EXPERIENCE_OPTIONS = [
  { label: '< 1 year',   value: 0 },
  { label: '1–2 years',  value: 1 },
  { label: '3–5 years',  value: 3 },
  { label: '5–10 years', value: 5 },
  { label: '10+ years',  value: 10 },
];

// Default rate per service (PKR)
const DEFAULT_RATES: Record<string, number> = {
  ac_repair: 2500, ac_installation: 4000, plumbing: 2000, electrical: 2500,
  carpentry: 1800, painting: 1500, cleaning: 1500, home_appliance: 2000,
  mechanic: 2000, tutoring: 1000,
};

const TOTAL_STEPS = 4;

export default function ProviderOnboardingScreen() {
  const { user, completeProviderOnboarding } = useApp();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  // Step 2
  const [city, setCity] = useState('');
  const [specificArea, setSpecificArea] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(1);
  const [bio, setBio] = useState('');
  // Step 3
  const [rates, setRates] = useState<Record<string, string>>({});
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [certifications, setCertifications] = useState('');

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const canAdvance = () => {
    if (step === 1) return selectedServices.length > 0;
    if (step === 2) return city.trim().length > 0;
    if (step === 3) return selectedDays.length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) {
      const msgs: Record<number, string> = {
        1: 'Please select at least one service you offer.',
        2: 'Please select your primary city.',
        3: 'Please select at least one working day.',
      };
      Alert.alert('Required', msgs[step]);
      return;
    }
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };

  const handleFinish = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000)); // Simulate Firestore save

    const rateCard: Record<string, number> = {};
    for (const svc of selectedServices) {
      const entered = parseInt(rates[svc] || '0', 10);
      rateCard[svc] = entered > 0 ? entered : DEFAULT_RATES[svc] ?? 2000;
    }
    
    const areaString = specificArea ? `${specificArea}, ${city}` : city;

    const profile: ProviderProfile = {
      serviceTypes: selectedServices,
      area: areaString,
      experienceYears,
      bio: bio.trim() || `Experienced ${selectedServices[0]?.replace(/_/g, ' ')} specialist in ${areaString}.`,
      rateCard,
      availability: selectedDays,
      certifications: certifications.split(',').map(c => c.trim()).filter(Boolean),
    };

    completeProviderOnboarding(profile);
    setIsSaving(false);
    // Navigator auto-switches to ProviderTabs once isNewUser = false
  };

  // ─── Step Renders ──────────────────────────────────────────

  const Step1Services = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>What services do you offer?</Text>
      <Text style={styles.stepSubtitle}>Select all that apply. You can update this later.</Text>
      <View style={styles.serviceGrid}>
        {ALL_SERVICES.map(svc => {
          const selected = selectedServices.includes(svc.id);
          return (
            <Pressable
              key={svc.id}
              style={[styles.serviceChip, selected && styles.serviceChipSelected]}
              onPress={() => toggleService(svc.id)}
            >
              <Text style={styles.serviceChipIcon}>{svc.icon}</Text>
              <Text style={[styles.serviceChipLabel, selected && styles.serviceChipLabelSelected]}>
                {svc.label}
              </Text>
              {selected && <Text style={styles.serviceChipCheck}>✓</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const Step2Location = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>Where do you work?</Text>
      <Text style={styles.stepSubtitle}>Your primary service location in Pakistan.</Text>

      <Text style={styles.fieldLabel}>City *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.areaScroll}>
        <View style={styles.areaChips}>
          {CITIES.map(c => (
            <Pressable
              key={c}
              style={[styles.areaChip, city === c && styles.areaChipSelected]}
              onPress={() => setCity(c)}
            >
              <Text style={[styles.areaChipText, city === c && styles.areaChipTextSelected]}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {city !== '' && <Text style={styles.selectedArea}>📍 Selected City: {city}</Text>}

      <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>Specific Area / Sector (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. G-13, DHA Phase 5, Clifton"
        placeholderTextColor={COLORS.placeholder}
        value={specificArea}
        onChangeText={setSpecificArea}
      />

      <Text style={[styles.fieldLabel, { marginTop: SPACING.xl }]}>Years of Experience *</Text>
      <View style={styles.expRow}>
        {EXPERIENCE_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.expChip, experienceYears === opt.value && styles.expChipSelected]}
            onPress={() => setExperienceYears(opt.value)}
          >
            <Text style={[styles.expChipText, experienceYears === opt.value && styles.expChipTextSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: SPACING.xl }]}>Short Bio (optional)</Text>
      <TextInput
        style={styles.textArea}
        placeholder={`e.g. "10 years experience in AC repair, licensed technician, serving G-sector Islamabad"`}
        placeholderTextColor={COLORS.placeholder}
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
        maxLength={250}
      />
    </View>
  );

  const Step3Rates = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>Set your base rates</Text>
      <Text style={styles.stepSubtitle}>
        These are your starting rates (PKR). Leave blank to use suggested rates.
      </Text>

      {selectedServices.map(svc => {
        const svcInfo = ALL_SERVICES.find(s => s.id === svc);
        const suggested = DEFAULT_RATES[svc] ?? 2000;
        return (
          <View key={svc} style={styles.rateRow}>
            <Text style={styles.rateLabel}>{svcInfo?.icon} {svcInfo?.label}</Text>
            <View style={styles.rateInputWrap}>
              <Text style={styles.ratePrefix}>Rs.</Text>
              <TextInput
                style={styles.rateInput}
                placeholder={String(suggested)}
                placeholderTextColor={COLORS.placeholder}
                value={rates[svc] ?? ''}
                onChangeText={val => setRates(prev => ({ ...prev, [svc]: val.replace(/\D/g, '') }))}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
          </View>
        );
      })}

      <Text style={[styles.fieldLabel, { marginTop: SPACING.xl }]}>Working Days *</Text>
      <View style={styles.dayRow}>
        {DAYS.map(day => (
          <Pressable
            key={day}
            style={[styles.dayChip, selectedDays.includes(day) && styles.dayChipSelected]}
            onPress={() => toggleDay(day)}
          >
            <Text style={[styles.dayChipText, selectedDays.includes(day) && styles.dayChipTextSelected]}>
              {day}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: SPACING.xl }]}>Certifications (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. SSGC Certified, PEC Licensed (comma-separated)"
        placeholderTextColor={COLORS.placeholder}
        value={certifications}
        onChangeText={setCertifications}
      />
    </View>
  );

  const Step4Done = () => (
    <View style={[styles.stepBody, styles.doneStep]}>
      <Text style={styles.doneEmoji}>🎉</Text>
      <Text style={styles.doneTitle}>You're all set, {user?.name?.split(' ')[0]}!</Text>
      <Text style={styles.doneSubtitle}>
        Your provider profile is ready. You'll start receiving job opportunities that match your services and area.
      </Text>
      <View style={styles.summaryCard}>
        <SummaryRow icon="🔧" label="Services" value={selectedServices.map(s => ALL_SERVICES.find(a => a.id === s)?.label).join(', ')} />
        <SummaryRow icon="📍" label="Area" value={specificArea ? `${specificArea}, ${city}` : city} />
        <SummaryRow icon="⏰" label="Availability" value={selectedDays.join(', ')} />
        <SummaryRow icon="💰" label="Base Rate" value={`Rs. ${Math.min(...selectedServices.map(s => parseInt(rates[s] || String(DEFAULT_RATES[s] ?? 2000))))} onwards`} />
      </View>
      <Text style={styles.doneNote}>
        ⚙️ Your profile will be reviewed by UstaJi within 24 hours before going live.
      </Text>
    </View>
  );

  const SummaryRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerStep}>Step {step} of {TOTAL_STEPS}</Text>
          <Text style={styles.headerTitle}>Provider Setup</Text>
        </View>
        {/* Progress dots */}
        <View style={styles.progressDots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i < step && styles.dotDone, i === step - 1 && styles.dotCurrent]} />
          ))}
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 1 && <Step1Services />}
        {step === 2 && <Step2Location />}
        {step === 3 && <Step3Rates />}
        {step === 4 && <Step4Done />}
        <View style={{ height: SPACING.xxxl * 3 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        {step > 1 && step < 4 && (
          <Pressable style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
        )}
        {step < 4 ? (
          <Pressable style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Continue →</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.nextBtn} onPress={handleFinish} disabled={isSaving}>
            {isSaving
              ? <ActivityIndicator color={COLORS.text.inverse} />
              : <Text style={styles.nextBtnText}>🚀 Go to Dashboard</Text>
            }
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  headerLeft: { gap: 2 },
  headerStep: { fontSize: FONT.size.xs, color: COLORS.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  progressDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotDone: { backgroundColor: COLORS.brand.primary },
  dotCurrent: { backgroundColor: COLORS.brand.primary, width: 20 },

  progressBarBg: { height: 3, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg, borderRadius: 2 },
  progressBarFill: { height: 3, backgroundColor: COLORS.brand.primary, borderRadius: 2 },

  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },

  stepBody: { gap: SPACING.md },
  stepTitle: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  stepSubtitle: { fontSize: FONT.size.md, color: COLORS.text.secondary, lineHeight: 22 },

  // Services grid
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  serviceChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.bg.secondary,
  },
  serviceChipSelected: { borderColor: COLORS.brand.primary, backgroundColor: COLORS.brand.primary + '12' },
  serviceChipIcon: { fontSize: 18 },
  serviceChipLabel: { fontSize: FONT.size.sm, color: COLORS.text.secondary, fontWeight: FONT.weight.medium },
  serviceChipLabelSelected: { color: COLORS.brand.primary, fontWeight: FONT.weight.semibold },
  serviceChipCheck: { fontSize: FONT.size.sm, color: COLORS.brand.primary, fontWeight: FONT.weight.bold },

  // Area
  fieldLabel: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  areaScroll: { marginTop: SPACING.xs },
  areaChips: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.xs },
  areaChip: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: COLORS.bg.secondary },
  areaChipSelected: { borderColor: COLORS.brand.primary, backgroundColor: COLORS.brand.primary + '15' },
  areaChipText: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  areaChipTextSelected: { color: COLORS.brand.primary, fontWeight: FONT.weight.semibold },
  selectedArea: { fontSize: FONT.size.sm, color: COLORS.brand.primary, fontWeight: FONT.weight.medium, marginTop: SPACING.xs },

  // Experience
  expRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  expChip: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: COLORS.bg.secondary },
  expChipSelected: { borderColor: COLORS.brand.primary, backgroundColor: COLORS.brand.primary + '12' },
  expChipText: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  expChipTextSelected: { color: COLORS.brand.primary, fontWeight: FONT.weight.semibold },

  // Bio / text inputs
  textArea: {
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: SPACING.lg, fontSize: FONT.size.md, color: COLORS.text.primary,
    textAlignVertical: 'top', minHeight: 80, marginTop: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    fontSize: FONT.size.md, color: COLORS.text.primary, marginTop: SPACING.xs,
  },

  // Rates
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  rateLabel: { fontSize: FONT.size.md, color: COLORS.text.primary, flex: 1 },
  rateInputWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, backgroundColor: COLORS.bg.secondary },
  ratePrefix: { fontSize: FONT.size.sm, color: COLORS.text.secondary },
  rateInput: { width: 80, paddingVertical: SPACING.xs, fontSize: FONT.size.md, color: COLORS.text.primary, textAlign: 'right' },

  // Days
  dayRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs, flexWrap: 'wrap' },
  dayChip: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg.secondary },
  dayChipSelected: { borderColor: COLORS.brand.primary, backgroundColor: COLORS.brand.primary },
  dayChipText: { fontSize: FONT.size.xs, color: COLORS.text.secondary, fontWeight: FONT.weight.medium },
  dayChipTextSelected: { color: COLORS.text.inverse, fontWeight: FONT.weight.bold },

  // Done step
  doneStep: { alignItems: 'center', paddingTop: SPACING.xl },
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.text.primary, textAlign: 'center' },
  doneSubtitle: { fontSize: FONT.size.md, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 24 },
  summaryCard: {
    width: '100%', backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm, gap: SPACING.sm,
    alignSelf: 'stretch',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  summaryIcon: { fontSize: 18, width: 24 },
  summaryLabel: { fontSize: FONT.size.sm, color: COLORS.text.secondary, fontWeight: FONT.weight.medium, width: 80 },
  summaryValue: { flex: 1, fontSize: FONT.size.sm, color: COLORS.text.primary, fontWeight: FONT.weight.semibold },
  doneNote: {
    fontSize: FONT.size.sm, color: COLORS.text.secondary, textAlign: 'center',
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, alignSelf: 'stretch',
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg.primary,
  },
  backBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg, alignItems: 'center',
  },
  backBtnText: { fontSize: FONT.size.md, color: COLORS.text.secondary, fontWeight: FONT.weight.semibold },
  nextBtn: {
    flex: 2, backgroundColor: COLORS.brand.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOW.brand,
  },
  nextBtnDisabled: { backgroundColor: COLORS.text.tertiary },
  nextBtnText: { fontSize: FONT.size.md, color: COLORS.text.inverse, fontWeight: FONT.weight.bold },
});
