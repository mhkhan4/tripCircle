import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export function useAuth() {
  const { session, user, setSession, setUser } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setUser(data);
      return;
    }
    // Profile row doesn't exist — trigger likely failed (e.g. phone auth before migration).
    // Upsert it from session metadata so the user isn't stuck.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const meta = session.user.user_metadata ?? {};
    const fullName: string =
      meta.full_name ??
      [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
      '';
    const { data: created } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: session.user.email ?? null,
        phone: session.user.phone ?? null,
        first_name: meta.first_name ?? null,
        last_name: meta.last_name ?? null,
        full_name: fullName || null,
        avatar_url: meta.avatar_url ?? meta.picture ?? null,
        provider: (session.user.app_metadata?.provider as string) ?? 'email',
      })
      .select()
      .single();
    if (created) setUser(created);
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch {
      // sign out locally even if server call fails
    }
    setSession(null);
    setUser(null);
  }

  return { session, user, signOut };
}
