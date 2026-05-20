// AppContext — global user, role, auth state
// Single source of truth for: who is logged in + are they a user or provider

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiService } from '../services/api';

export type UserRole = 'user' | 'provider';

export interface ProviderProfile {
  serviceTypes: string[];           // e.g. ['ac_repair', 'ac_installation']
  area: string;                     // e.g. 'G-13, Islamabad'
  experienceYears: number;
  bio: string;
  rateCard: Record<string, number>; // service → base rate (PKR)
  availability: string[];           // e.g. ['Mon', 'Tue', ...]
  certifications: string[];
}

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isNewUser: boolean;               // true until they complete onboarding
  providerProfile?: ProviderProfile; // only set for providers after onboarding
}

interface AppContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  completeProviderOnboarding: (profile: ProviderProfile) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (phone: string, name: string, role: UserRole) => {
    setIsLoading(true);
    // Simulate async auth (replace with Firebase Auth later)
    await new Promise(r => setTimeout(r, 800));

    // In production: check Firestore for existing profile
    // For now: treat every login as a new user (no localStorage/AsyncStorage yet)
    const isNew = true; // TODO: check AsyncStorage/Firestore for existing profile

    setUser({
      id: `user-${phone.replace(/\D/g, '')}`,
      name,
      phone,
      role,
      isNewUser: isNew,
    });
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    if (user) setUser({ ...user, role, isNewUser: role === 'provider' });
  }, [user]);

  /**
   * Called after provider completes the onboarding wizard.
   * Saves their profile to context (and in production, Firestore).
   */
  const completeProviderOnboarding = useCallback(async (profile: ProviderProfile) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, isNewUser: false, providerProfile: profile } : null);
    
    try {
      await apiService.registerProvider({
        id: user.id,
        name: user.name,
        phone: user.phone,
        service_types: profile.serviceTypes,
        location: { area: profile.area, city: profile.area.includes(',') ? profile.area.split(',')[1].trim() : 'Unknown' },
        experience_years: profile.experienceYears,
        bio: profile.bio,
        rate_card: profile.rateCard,
        availability: profile.availability,
        certifications: profile.certifications,
      });
    } catch (e) {
      console.warn('Failed to save provider to backend:', e);
    }
  }, [user]);

  return (
    <AppContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
      switchRole,
      completeProviderOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
