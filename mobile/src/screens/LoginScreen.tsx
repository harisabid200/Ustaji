// LoginScreen — Phone auth + role selection
// Light theme: white background, emerald CTAs, clean forms

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { useApp, UserRole } from '../context/AppContext';

const ROLE_OPTIONS: { role: UserRole; title: string; subtitle: string; icon: string }[] = [
  {
    role: 'user',
    title: 'I need services',
    subtitle: 'Find plumbers, electricians, AC technicians & more',
    icon: '🏠',
  },
  {
    role: 'provider',
    title: 'I provide services',
    subtitle: 'Get more clients, manage bookings & grow earnings',
    icon: '🔧',
  },
];

export default function LoginScreen() {
  const { login, isLoading } = useApp();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [error, setError] = useState('');

  const handleSendOtp = () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (phone.length < 10) { setError('Please enter a valid phone number'); return; }
    setError('');
    setStep('otp');
  };

  const handleVerify = async () => {
    if (otp.length < 4) { setError('Please enter the 4-digit OTP'); return; }
    setError('');
    // Simulated: any 4-digit OTP works
    await login(phone, name.trim(), selectedRole);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo / Hero */}
          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🔧</Text>
            </View>
            <Text style={styles.appName}>UstaJi</Text>
            <Text style={styles.tagline}>Pakistan's smartest service marketplace</Text>
          </View>

          {step === 'details' ? (
            <>
              {/* Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Your name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ahmed Ali"
                  placeholderTextColor={COLORS.placeholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Phone */}
              <View style={styles.field}>
                <Text style={styles.label}>Phone number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>🇵🇰 +92</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="3xx-xxxxxxx"
                    placeholderTextColor={COLORS.placeholder}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={11}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Role selection */}
              <View style={styles.field}>
                <Text style={styles.label}>I want to...</Text>
                {ROLE_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.role}
                    style={[styles.roleCard, selectedRole === opt.role && styles.roleCardSelected]}
                    onPress={() => setSelectedRole(opt.role)}
                  >
                    <Text style={styles.roleIcon}>{opt.icon}</Text>
                    <View style={styles.roleText}>
                      <Text style={[styles.roleTitle, selectedRole === opt.role && styles.roleTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={styles.roleSubtitle}>{opt.subtitle}</Text>
                    </View>
                    <View style={[styles.radioOuter, selectedRole === opt.role && styles.radioOuterSelected]}>
                      {selectedRole === opt.role && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                ))}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.primaryBtn} onPress={handleSendOtp}>
                <Text style={styles.primaryBtnText}>Send OTP →</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* OTP step */}
              <View style={styles.otpHeader}>
                <Text style={styles.otpTitle}>Enter verification code</Text>
                <Text style={styles.otpSubtitle}>
                  Sent to +92 {phone} {'\n'}(For demo: enter any 4 digits)
                </Text>
              </View>

              <View style={styles.field}>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • •"
                  placeholderTextColor={COLORS.placeholder}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                  textAlign="center"
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.primaryBtn} onPress={handleVerify} disabled={isLoading}>
                {isLoading
                  ? <ActivityIndicator color={COLORS.text.inverse} />
                  : <Text style={styles.primaryBtnText}>Verify & Continue →</Text>
                }
              </Pressable>

              <Pressable onPress={() => { setStep('details'); setOtp(''); setError(''); }}>
                <Text style={styles.backLink}>← Change number</Text>
              </Pressable>
            </>
          )}

          {/* Demo shortcut */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.demoBtn}
            onPress={() => login('3001234567', 'Demo User', selectedRole)}
          >
            <Text style={styles.demoBtnText}>
              {selectedRole === 'provider' ? '🔧 Continue as Demo Provider' : '🏠 Continue as Demo User'}
            </Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  flex: { flex: 1 },
  scroll: { padding: SPACING.xxl, paddingTop: SPACING.xl },

  hero: { alignItems: 'center', marginBottom: SPACING.xxxl },
  logoCircle: {
    width: 80, height: 80, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.brand.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOW.brand,
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    fontSize: FONT.size.xxxl, fontWeight: FONT.weight.bold,
    color: COLORS.text.primary, letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FONT.size.md, color: COLORS.text.secondary,
    marginTop: SPACING.xs, textAlign: 'center',
  },

  field: { marginBottom: SPACING.lg },
  label: {
    fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold,
    color: COLORS.text.secondary, marginBottom: SPACING.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    fontSize: FONT.size.md, color: COLORS.text.primary,
  },
  phoneRow: { flexDirection: 'row', gap: SPACING.sm },
  countryCode: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    justifyContent: 'center',
  },
  countryCodeText: { fontSize: FONT.size.md, color: COLORS.text.primary, fontWeight: FONT.weight.medium },
  phoneInput: { flex: 1 },

  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bg.secondary,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    padding: SPACING.lg, marginBottom: SPACING.sm,
  },
  roleCardSelected: {
    borderColor: COLORS.brand.primary,
    backgroundColor: COLORS.successBg ?? '#ECFDF5',
  },
  roleIcon: { fontSize: 28 },
  roleText: { flex: 1 },
  roleTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  roleTitleSelected: { color: COLORS.brand.secondary },
  roleSubtitle: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 2 },
  radioOuter: {
    width: 22, height: 22, borderRadius: RADIUS.full,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.brand.primary },
  radioInner: { width: 10, height: 10, borderRadius: RADIUS.full, backgroundColor: COLORS.brand.primary },

  error: {
    color: COLORS.error, fontSize: FONT.size.sm,
    marginBottom: SPACING.md, textAlign: 'center',
  },

  primaryBtn: {
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.md, paddingVertical: SPACING.lg,
    alignItems: 'center', marginTop: SPACING.sm,
    ...SHADOW.brand,
  },
  primaryBtnText: { color: COLORS.text.inverse, fontSize: FONT.size.lg, fontWeight: FONT.weight.bold },

  otpHeader: { alignItems: 'center', marginBottom: SPACING.xl },
  otpTitle: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  otpSubtitle: { fontSize: FONT.size.sm, color: COLORS.text.secondary, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 20 },
  otpInput: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, letterSpacing: 12, textAlign: 'center' },

  backLink: {
    textAlign: 'center', color: COLORS.text.brand ?? COLORS.brand.primary,
    fontSize: FONT.size.sm, marginTop: SPACING.lg,
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.xl, gap: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.text.tertiary, fontSize: FONT.size.sm },

  demoBtn: {
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.brand.primary,
    paddingVertical: SPACING.lg, alignItems: 'center', marginBottom: SPACING.xl,
  },
  demoBtnText: { color: COLORS.brand.primary, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
});
