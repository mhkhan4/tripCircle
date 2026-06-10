import { View, Text, FlatList, TouchableOpacity, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useGroup } from '../../../hooks/useGroup';
import { useTrips, useTripMembers, useJoinTrip } from '../../../hooks/useTrip';
import { useAppStore } from '../../../store/useAppStore';
import { useTheme } from '../../../hooks/useTheme';
import { PressableCard } from '../../../components/ui/PressableCard';
import type { Trip } from '../../../types';

const STATUS_COLOR: Record<string, string> = {
  planning: '#F59E0B',
  confirmed: '#2563EB',
  ongoing: '#10B981',
  completed: '#94A3B8',
};

function TripCard({ item, groupId }: { item: Trip; groupId: string }) {
  const router = useRouter();
  const { user } = useAppStore();
  const { isDark } = useTheme();
  const { data: tripMembers } = useTripMembers(item.id);
  const joinTrip = useJoinTrip();
  const color = STATUS_COLOR[item.status];
  const isMember = tripMembers?.some((m) => m.user_id === user?.id) ?? false;

  async function handleJoin() {
    try {
      await joinTrip.mutateAsync({ tripId: item.id, groupId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <PressableCard
      onPress={() => router.push(`/group/${groupId}/trip/${item.id}`)}
      className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/50"
    >
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{item.title}</Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text className="text-xs font-semibold tracking-wider uppercase text-slate-400">{item.destination}</Text>
          </View>
          <View className="mt-1 flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              {format(new Date(item.start_date + 'T12:00:00'), 'MMM d')} – {format(new Date(item.end_date + 'T12:00:00'), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <View className="items-end gap-3">
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}15` }}>
            <Text className="text-xs font-bold capitalize" style={{ color }}>{item.status}</Text>
          </View>
          {!isMember && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleJoin(); }}
              disabled={joinTrip.isPending}
              activeOpacity={0.9}
              className="rounded-full bg-slate-900 dark:bg-white px-4 py-1.5 transition-all duration-200 active:scale-95"
            >
              <Text className="text-xs font-bold text-white dark:text-slate-900">Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </PressableCard>
  );
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const { data: group } = useGroup(id);
  const { data: trips } = useTrips(id);

  function shareInvite() {
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://triporbit.app';
    const joinUrl = `${webUrl}/join/${group?.invite_code}`;
    Share.share({
      message: `Join my TripOrbit group "${group?.name}"! Tap the link to join automatically:\n${joinUrl}`,
      url: joinUrl,
    });
  }

  function renderTrip({ item }: { item: Trip }) {
    return <TripCard item={item} groupId={id} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-slate-950/60" edges={['bottom']}>
      <Stack.Screen options={{ title: group?.name ?? 'Group' }} />

      {/* Group header card */}
      <View className="mx-5 mb-8 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
        <View className="flex-row items-center gap-4">
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#0f172a',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: 'white' }}>
              {group?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">{group?.name}</Text>
            {group?.description ? (
              <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{group.description}</Text>
            ) : null}
          </View>
        </View>
        <View className="mt-6 flex-row gap-3">
          <TouchableOpacity
            onPress={shareInvite}
            activeOpacity={0.9}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 transition-all duration-200 active:scale-95 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <Ionicons name="share-outline" size={16} color={isDark ? '#cbd5e1' : '#334155'} />
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Invite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/group/${id}/members`)}
            activeOpacity={0.9}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 transition-all duration-200 active:scale-95 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <Ionicons name="people-outline" size={16} color={isDark ? '#cbd5e1' : '#334155'} />
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/group/${id}/chat`)}
            activeOpacity={0.9}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 transition-all duration-200 active:scale-95 dark:bg-white"
          >
            <Ionicons name="chatbubbles-outline" size={16} color={isDark ? '#0f172a' : 'white'} />
            <Text className="text-sm font-bold text-white dark:text-slate-900">Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={trips ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListHeaderComponent={
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: isDark ? '#ffffff' : '#0f172a' }} />
              <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Trips</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/group/${id}/trip/new`)}
              activeOpacity={0.9}
              className="flex-row items-center gap-1 transition-all duration-200 active:scale-95"
            >
              <Ionicons name="add-circle" size={18} color={isDark ? '#ffffff' : '#0f172a'} />
              <Text className="text-sm font-bold text-slate-900 dark:text-white">New Trip</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 56 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="map-outline" size={36} color={isDark ? '#cbd5e1' : '#64748b'} />
            </View>
            <Text className="text-base font-bold text-slate-900 dark:text-white">No trips yet</Text>
            <Text className="mt-1 text-sm text-slate-500">Plan your first adventure together.</Text>
            <TouchableOpacity
              onPress={() => router.push(`/group/${id}/trip/new`)}
              activeOpacity={0.9}
              className="mt-6 rounded-xl bg-slate-900 dark:bg-white px-6 py-3.5 transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Text className="font-bold text-white dark:text-slate-900">Plan a Trip</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}
