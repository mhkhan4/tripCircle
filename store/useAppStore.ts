import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile, Group } from '../types';

export const GUEST_USER: UserProfile = {
  id: 'guest-000',
  email: 'guest@tripcircle.app',
  full_name: 'Guest User',
  username: null,
  avatar_url: null,
  provider: 'email',
  created_at: new Date().toISOString(),
};

type AppStore = {
  session: Session | null;
  user: UserProfile | null;
  activeGroup: Group | null;
  isGuest: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: UserProfile | null) => void;
  setActiveGroup: (group: Group | null) => void;
  signInAsGuest: () => void;
  signOutGuest: () => void;
};

export const useAppStore = create<AppStore>((set) => ({
  session: null,
  user: null,
  activeGroup: null,
  isGuest: false,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setActiveGroup: (group) => set({ activeGroup: group }),
  signInAsGuest: () => set({ user: GUEST_USER, isGuest: true }),
  signOutGuest: () => set({ user: null, isGuest: false }),
}));
