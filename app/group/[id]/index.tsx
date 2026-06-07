import { View, Text, FlatList, TouchableOpacity, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useGroup } from '../../../hooks/useGroup';
import { useTrips, useTripMembers, useJoinTrip } from '../../../hooks/useTrip';
import { useGroupJoinRequests } from '../../../hooks/useDiscover';
import { useAppStore } from '../../../store/useAppStore';
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
    <TouchableOpacity
      onPress={() => router.push(`/group/${groupId}/trip/${item.id}`)}
      className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
      style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 dark:text-white">{item.title}</Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">{item.destination}</Text>
          </View>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(item.start_date), 'MMM d')} – {format(new Date(item.end_date), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <View className="items-end gap-2">
          <View className="rounded-full px-2 py-1" style={{ backgroundColor: `${color}20` }}>
            <Text className="text-xs font-semibold capitalize" style={{ color }}>{item.status}</Text>
          </View>
          {!isMember && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleJoin(); }}
              disabled={joinTrip.isPending}
              className="rounded-full bg-primary px-3 py-1"
            >
              <Text className="text-xs font-bold text-white">Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAppStore();
  const { data: group } = useGroup(id);
  const { data: trips } = useTrips(id);
  const { data: joinRequests } = useGroupJoinRequests(id);

  const members = (group as any)?.group_members ?? [];
  const isAdmin = members.some((m: any) => m.user_id === user?.id && m.role === 'admin');
  const pendingCount = joinRequests?.length ?? 0;

  function shareInvite() {
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://tripcircle.vercel.app';
    const joinUrl = `${webUrl}/join/${group?.invite_code}`;
    Share.share({
      message: `Join my TripCircle group "${group?.name}"! Tap the link to join automatically:\n${joinUrl}`,
      url: joinUrl,
    });
  }

  function renderTrip({ item }: { item: Trip }) {
    return <TripCard item={item} groupId={id} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: group?.name ?? 'Group' }} />
      <View className="mx-5 mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Text className="text-2xl font-bold text-white">{group?.name?.[0]?.toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">{group?.name}</Text>
            {group?.description ? <Text className="text-sm text-gray-500 dark:text-gray-400">{group.description}</Text> : null}
          </View>
        </View>
        <View className="mt-3 flex-row gap-2">
          <TouchableOpacity onPress={shareInvite} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-primary py-2">
            <Ionicons name="share-outline" size={16} color="#2563EB" />
            <Text className="text-sm font-semibold text-primary">Invite</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/group/${id}/members`)} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 py-2">
            <Ionicons name="people-outline" size={16} color="#64748B" />
            <Text className="text-sm font-semibold text-gray-600">Members</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/group/${id}/chat`)} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-2">
            <Ionicons name="chatbubbles-outline" size={16} color="white" />
            <Text className="text-sm font-semibold text-white">Chat</Text>
          </TouchableOpacity>
        </View>
        {isAdmin && pendingCount > 0 && (
          <TouchableOpacity
            onPress={() => router.push(`/group/${id}/join-requests`)}
            className="mt-2 flex-row items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 dark:bg-amber-900/20"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="person-add-outline" size={16} color="#D97706" />
              <Text className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {pendingCount} join request{pendingCount !== 1 ? 's' : ''} pending
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#D97706" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={trips ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListHeaderComponent={
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold uppercase tracking-wide text-gray-400">Trips</Text>
            <TouchableOpacity onPress={() => router.push(`/group/${id}/trip/new`)} className="flex-row items-center gap-1">
              <Ionicons name="add-circle" size={18} color="#2563EB" />
              <Text className="text-sm font-semibold text-primary">New Trip</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Ionicons name="map-outline" size={48} color="#CBD5E1" />
            <Text className="mt-3 text-base font-semibold text-gray-600 dark:text-gray-300">No trips yet</Text>
            <Text className="mt-1 text-sm text-gray-400">Plan your first adventure together.</Text>
            <TouchableOpacity onPress={() => router.push(`/group/${id}/trip/new`)} className="mt-4 rounded-2xl bg-primary px-5 py-2">
              <Text className="font-semibold text-white">Plan a Trip</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}
