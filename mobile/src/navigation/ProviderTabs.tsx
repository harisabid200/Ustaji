// ProviderTabs — Bottom tab navigator for the provider role
// Tabs: Dashboard, Jobs, Schedule, Earnings, Settings (with logout)
// Mobile-design skill: safe area, min 48dp targets, active indicator

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme';
import ProviderDashboardScreen from '../screens/provider/ProviderDashboardScreen';
import OpportunityScreen from '../screens/provider/OpportunityScreen';
import ProviderScheduleScreen from '../screens/provider/ProviderScheduleScreen';
import ProviderEarningsScreen from '../screens/provider/ProviderEarningsScreen';
import ProviderSettingsScreen from '../screens/provider/ProviderSettingsScreen';

const Tab = createBottomTabNavigator();

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabIcon}>
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function ProviderTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ProviderDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Opportunities"
        component={OpportunityScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" label="Jobs" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ProviderScheduleScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="Schedule" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={ProviderEarningsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" label="Earnings" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={ProviderSettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bg.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 80 : 64,
    paddingTop: 6,
    ...SHADOW.sm,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: SPACING.xs,
    minWidth: 56,
    minHeight: 48,
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  indicatorActive: {
    backgroundColor: COLORS.brand.primary,
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.55,
  },
  tabEmojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontWeight: FONT.weight.medium,
  },
  tabLabelFocused: {
    color: COLORS.brand.primary,
    fontWeight: FONT.weight.semibold,
  },
});
