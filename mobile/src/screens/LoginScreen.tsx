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
  const { login, signup, isLoading } = useApp();
  
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    
    if (!email.includes('@')) { setError('Please enter a valid email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your name'); return; }
        await signup(email.trim(), password, name.trim(), selectedRole);
      } else {
        await login(email.trim(), password);
      }
    } catch (e: any) {
      // Clean up Firebase error messages
      const msg = e.message.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '').trim();
      setError(msg || 'Authentication failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Logo / Hero */}
          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🔧</Text>
            </View>
            <Text style={styles.appName}>UstaJi</Text>
            <Text style={styles.tagline}>Pakistan's smartest service marketplace</Text>
          </View>

          {mode === 'signup' && (
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
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={COLORS.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
            />
          </View>

          {mode === 'signup' && (
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
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color={COLORS.text.inverse} />
              : <Text style={styles.primaryBtnText}>{mode === 'signup' ? 'Create Account' : 'Log In'}</Text>
            }
          </Pressable>

          <Pressable 
            style={styles.toggleBtn} 
            onPress={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}
          >
            <Text style={styles.toggleText}>
              {mode === 'signup' ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
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

  toggleBtn: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    padding: SPACING.sm,
  },
  toggleText: {
    color: COLORS.text.brand ?? COLORS.brand.primary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
});
