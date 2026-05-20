// AppNavigator — Root navigator
// Auth gate → role-based routing → onboarding gate for new providers

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import LoginScreen from '../screens/LoginScreen';
import UserTabs from './UserTabs';
import ProviderTabs from './ProviderTabs';
import ProviderOnboardingScreen from '../screens/ProviderOnboardingScreen';
import CategoryScreen from '../screens/CategoryScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import ProviderProfileScreen from '../screens/ProviderProfileScreen';
import RatingScreen from '../screens/RatingScreen';
import { COLORS } from '../theme';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, user, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg.primary }}>
        <ActivityIndicator size="large" color={COLORS.brand.primary} />
      </View>
    );
  }

  // New provider → must complete onboarding before seeing dashboard
  const isNewProvider = isAuthenticated && user?.role === 'provider' && user?.isNewUser;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>

        {/* ─── Auth Gate ──────────────────────────────── */}
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />

        /* ─── New Provider → Onboarding ─────────────── */
        ) : isNewProvider ? (
          <Stack.Screen
            name="ProviderOnboarding"
            component={ProviderOnboardingScreen}
            options={{ gestureEnabled: false }} // Can't swipe back
          />

        /* ─── Returning Provider → Dashboard ────────── */
        ) : user?.role === 'provider' ? (
          <>
            <Stack.Screen name="ProviderMain" component={ProviderTabs} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
          </>

        /* ─── User (Consumer) ───────────────────────── */
        ) : (
          <>
            <Stack.Screen name="UserMain" component={UserTabs} />
            <Stack.Screen name="Category" component={CategoryScreen} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
            <Stack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
            <Stack.Screen name="Rating" component={RatingScreen} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}
