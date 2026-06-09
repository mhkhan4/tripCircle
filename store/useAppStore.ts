import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile, Group } from '../types';

type AppStore = {
  session: Session | null;
  user: UserProfile | null;
  activeGroup: Group | null;
  theme: 'dark' | 'light';
  setSession: (session: Session | null) => void;
  setUser: (user: UserProfile | null) => void;
  setActiveGroup: (group: Group | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      activeGroup: null,
      theme: 'dark',
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setActiveGroup: (group) => set({ activeGroup: group }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
