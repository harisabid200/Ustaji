// ProfileScreen — User profile + settings + role switch
import React from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView,
  StatusBar, ScrollView, Alert,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { useApp } from '../context/AppContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, switchRole } = useApp();

  const handleSwitchToProvider = () => {
    Alert.alert(
      'Switch to Provider Mode',
      'You will see the provider dashboard. Switch back anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: () => switchRole('provider') },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: '📋', label: 'My Bookings', onPress: () => navigation.navigate('Bookings') },
    { icon: '🔔', label: 'Notifications', onPress: () => {} },
    { icon: '🌐', label: 'Language / زبان', onPress: () => {} },
    { icon: '❓', label: 'Help & Support', onPress: () => {} },
    { icon: '📜', label: 'Terms & Privacy', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg.primary} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(user?.name ?? 'G')[0]}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.phone}>📱 +92 {user?.phone}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>👤 User Account</Text>
          </View>
        </View>

        {/* Switch to provider */}
        <Pressable style={styles.switchCard} onPress={handleSwitchToProvider}>
          <Text style={styles.switchIcon}>🔧</Text>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Are you a service provider?</Text>
            <Text style={styles.switchSubtitle}>Switch to provider mode to manage jobs</Text>
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

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <View style={{ height: SPACING.xxxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg.primary },
  profileHeader: { alignItems: 'center', padding: SPACING.xxl, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 80, height: 80, borderRadius: RADIUS.full, backgroundColor: COLORS.brand.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, ...SHADOW.brand },
  avatarInitial: { fontSize: FONT.size.xxxl, fontWeight: FONT.weight.bold, color: COLORS.text.inverse },
  name: { fontSize: FONT.size.xl, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  phone: { fontSize: FONT.size.md, color: COLORS.text.secondary, marginTop: SPACING.xs },
  roleBadge: { backgroundColor: COLORS.bg.secondary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  roleText: { fontSize: FONT.size.sm, color: COLORS.text.secondary, fontWeight: FONT.weight.medium },

  switchCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    margin: SPACING.lg, backgroundColor: COLORS.brand.amberLight,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.brand.amberBorder,
  },
  switchIcon: { fontSize: 28 },
  switchText: { flex: 1 },
  switchTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary },
  switchSubtitle: { fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: 2 },
  switchArrow: { fontSize: FONT.size.xl, color: COLORS.brand.amber },

  menu: { marginHorizontal: SPACING.lg },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  menuIcon: { fontSize: 22, width: 32 },
  menuLabel: { flex: 1, fontSize: FONT.size.md, color: COLORS.text.primary },
  menuArrow: { fontSize: 20, color: COLORS.text.tertiary },

  logoutBtn: { margin: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.error, paddingVertical: SPACING.lg, alignItems: 'center' },
  logoutText: { color: COLORS.error, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
});
