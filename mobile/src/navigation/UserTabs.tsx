// UserTabs — Bottom tab navigator for the user (consumer) role
// Tabs: Home, Chat, Bookings, Profile
// Mobile-design skill: safe area, min 44dp targets, active indicator pill

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={[styles.tabIcon]}>
      {/* Active indicator pill above icon */}
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function UserTabs() {
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Chat" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Bookings" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
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
    // Height: 56px content + safe area bottom (added dynamically)
    height: Platform.OS === 'ios' ? 80 : 64,
    paddingTop: 6,
    ...SHADOW.sm,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: SPACING.sm,
    width: 64,
    minHeight: 48,
  },
  // Active state: colored pill at top of tab
  indicator: {
    width: 24,
    height: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  indicatorActive: {
    backgroundColor: COLORS.brand.primary,
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.55,
  },
  tabEmojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.text.tertiary,
    fontWeight: FONT.weight.medium,
  },
  tabLabelFocused: {
    color: COLORS.brand.primary,
    fontWeight: FONT.weight.semibold,
  },
});
