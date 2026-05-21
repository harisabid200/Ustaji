// ProviderSettingsScreen — Settings + Logout for service providers
import React from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView,
  StatusBar, ScrollView, Alert, Switch,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../../theme';
import { useApp } from '../../context/AppContext';

export default function ProviderSettingsScreen({ navigation }: any) {
  const { user, logout, switchRole } = useApp();
  const profile = user?.providerProfile;

  const handleSwitchToUser = () => {
    Alert.alert(
      'Switch to User Mode',
      'You will see the customer view. Switch back anytime from your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: () => switchRole('user') },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: '📅', label: 'My Schedule', onPress: () => navigation.navigate('Schedule') },
    { icon: '💰', label: 'Earnings', onPress: () => navigation.navigate('Earnings') },
    { icon: '🔔', label: 'Notifications', onPress: () => {} },
    { icon: '❓', label: 'Help & Support', onPress: () => {} },
    { icon: '📜', label: 'Terms & Privacy', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Provider Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(user?.name ?? 'P')[0]}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>📧 {user?.email ?? 'Not set'}</Text>
          {profile?.area && (
            <Text style={styles.area}>📍 {profile.area}</Text>
          )}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>🔧 Service Provider</Text>
          </View>
        </View>

        {/* Services summary */}
        {profile?.serviceTypes && profile.serviceTypes.length > 0 && (
          <View style={styles.servicesSection}>
            <Text style={styles.sectionLabel}>Your Services</Text>
            <View style={styles.serviceChips}>
              {profile.serviceTypes.map(s => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Switch to Customer mode */}
        <Pressable style={styles.switchCard} onPress={handleSwitchToUser}>
          <Text style={styles.switchIcon}>👤</Text>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Switch to Customer Mode</Text>
            <Text style={styles.switchSubtitle}>Book services as a customer</Text>
          </View>
          <Text style={styles.switchArrow}>→</Text>
        </Pressable>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <Pressable key={i} style={styles.menuItem} onPress={item.onPress}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </Pressable>

        <View style={{ height: SPACING.xxxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },

  profileHeader: {
    alignItems: 'center',
    padding: SPACING.xxl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 80, height: 80, borderRadius: RADIUS.full,
    backgroundColor: COLORS.brand.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md, ...SHADOW.brand,
  },
  avatarInitial: { fontSize: FONT.size.xxxl, fontWeight: FONT.weight.bold, color: COLORS.text.inverse },
  name: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  email: { fontSize: FONT.size.md, color: COLORS.text.secondary, marginTop: SPACING.xs },
  area: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 2 },
  roleBadge: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.success + '40',
  },
  roleText: { fontSize: FONT.size.sm, color: COLORS.success, fontWeight: FONT.weight.semibold },

  servicesSection: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionLabel: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.text.secondary, marginBottom: SPACING.sm },
  serviceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, textTransform: 'capitalize' },

  switchCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    margin: SPACING.lg,
    backgroundColor: COLORS.infoBg,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.info + '40',
  },
  switchIcon: { fontSize: 28 },
  switchText: { flex: 1 },
  switchTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  switchSubtitle: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 2 },
  switchArrow: { fontSize: FONT.size.xl, color: COLORS.info },

  menu: { marginHorizontal: SPACING.lg },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    minHeight: 56,
  },
  menuIcon: { fontSize: 22, width: 32 },
  menuLabel: { flex: 1, fontSize: FONT.size.md, color: COLORS.text.primary },
  menuArrow: { fontSize: 20, color: COLORS.text.tertiary },

  logoutBtn: {
    margin: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.error,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    minHeight: 52,
  },
  logoutText: { color: COLORS.error, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
});
