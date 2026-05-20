import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { apiService } from '../services/api';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';

export type UserRole = 'user' | 'provider';

export interface ProviderProfile {
  serviceTypes: string[];           
  area: string;                     
  experienceYears: number;
  bio: string;
  rateCard: Record<string, number>; 
  availability: string[];           
  certifications: string[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string; // Used to be phone
  role: UserRole;
  avatar?: string;
  isNewUser: boolean;               
  providerProfile?: ProviderProfile; 
}

interface AppContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  completeProviderOnboarding: (profile: ProviderProfile) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true to wait for Firebase

  // Flag to skip onAuthStateChanged when signup handles state directly
  const signupInProgress = React.useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If signup is handling state, don't interfere
      if (signupInProgress.current) {
        setIsLoading(false);
        return;
      }
      
      if (firebaseUser) {
        // Load role and name from AsyncStorage
        const roleData = await AsyncStorage.getItem(`@role_${firebaseUser.uid}`);
        const nameData = await AsyncStorage.getItem(`@name_${firebaseUser.uid}`);
        const isNewData = await AsyncStorage.getItem(`@new_${firebaseUser.uid}`);
        
        const role = (roleData as UserRole) || 'user';
        const name = nameData || firebaseUser.email?.split('@')[0] || 'User';
        const isNewUser = isNewData === 'true';

        setUser({
          id: firebaseUser.uid,
          name,
          email: firebaseUser.email || '',
          role,
          isNewUser,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle the rest
    } catch (e) {
      setIsLoading(false);
      throw e;
    }
  }, []);

  const signup = useCallback(async (email: string, pass: string, name: string, role: UserRole) => {
    setIsLoading(true);
    signupInProgress.current = true;
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, pass);
      
      // Write to AsyncStorage FIRST (before onAuthStateChanged can read it)
      await AsyncStorage.setItem(`@role_${firebaseUser.uid}`, role);
      await AsyncStorage.setItem(`@name_${firebaseUser.uid}`, name);
      await AsyncStorage.setItem(`@new_${firebaseUser.uid}`, role === 'provider' ? 'true' : 'false');
      
      // Set user state directly with the correct role (don't rely on onAuthStateChanged)
      setUser({
        id: firebaseUser.uid,
        name,
        email: firebaseUser.email || email,
        role,
        isNewUser: role === 'provider',
      });
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      throw e;
    } finally {
      signupInProgress.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await signOut(auth);
  }, []);

  const switchRole = useCallback(async (role: UserRole) => {
    if (!user) return;
    // Persist to AsyncStorage so it survives app restart
    await AsyncStorage.setItem(`@role_${user.id}`, role);
    if (role === 'provider') {
      const isNewData = await AsyncStorage.getItem(`@new_${user.id}`);
      const isNew = isNewData !== 'false'; // Default to new if never onboarded
      setUser({ ...user, role, isNewUser: isNew });
    } else {
      setUser({ ...user, role, isNewUser: false });
    }
  }, [user]);

  const completeProviderOnboarding = useCallback(async (profile: ProviderProfile) => {
    if (!user) return;
    
    setUser(prev => prev ? { ...prev, isNewUser: false, providerProfile: profile } : null);
    await AsyncStorage.setItem(`@new_${user.id}`, 'false');
    
    try {
      await apiService.registerProvider({
        id: user.id,
        name: user.name,
        phone: user.email, // Backend still expects 'phone' field, map email to it for MVP
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
      signup,
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
