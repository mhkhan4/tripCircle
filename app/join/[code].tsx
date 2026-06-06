import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';

export const PENDING_INVITE_KEY = 'pendingInviteCode';

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { session, user } = useAppStore();

  useEffect(() => {
    if (!code) { router.replace('/(tabs)'); return; }
    // wait for profile to load before acting — session can be set while user is still null
    if (session && !user) return;
    handleJoin();
  }, [session, user, code]);

  async function handleJoin() {
    if (!session || !user) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
      router.replace('/(auth)/login');
      return;
    }

    // clear the pending key before the RPC so it doesn't loop on failure
    await AsyncStorage.removeItem(PENDING_INVITE_KEY);

    // security definer RPC bypasses RLS — non-member can join by invite code atomically
    try {
      const { data: groupId, error } = await supabase
        .rpc('join_group_by_invite_code', { code });

      if (error || !groupId) { router.replace('/(tabs)'); return; }

      router.replace(`/group/${groupId}`);
    } catch {
      router.replace('/(tabs)');
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <Stack.Screen options={{ title: 'Joining group...' }} />
      <ActivityIndicator size="large" color="#2563EB" />
      <Text className="mt-4 text-sm text-gray-400">Joining group...</Text>
    </View>
  );
}
