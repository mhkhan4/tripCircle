import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile, Group } from '../types';

type AppStore = {
  session: Session | null;
  user: UserProfile | null;
  activeGroup: Group | null;
  setSession: (session: Session | null) => void;
  setUser: (user: UserProfile | null) => void;
  setActiveGroup: (group: Group | null) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  session: null,
  user: null,
  activeGroup: null,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setActiveGroup: (group) => set({ activeGroup: group }),
}));
