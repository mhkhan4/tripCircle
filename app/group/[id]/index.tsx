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
      style={{
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderWidth: 1,
        borderColor: isDark ? '#334155' : '#f1f5f9',
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.25 : 0.07,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text className="text-base font-bold text-slate-900 dark:text-white">{item.title}</Text>
          <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text className="text-sm text-slate-500 dark:text-slate-400">{item.destination}</Text>
          </View>
          <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              {format(new Date(item.start_date + 'T12:00:00'), 'MMM d')} – {format(new Date(item.end_date + 'T12:00:00'), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: `${color}20` }}>
            <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'capitalize', color }}>{item.status}</Text>
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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['bottom']}>
      <Stack.Screen options={{ title: group?.name ?? 'Group' }} />

      {/* Group header card */}
      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 16,
          borderRadius: 20,
          padding: 16,
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.25 : 0.07,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#2563eb',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: 'white' }}>
              {group?.name?.[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="text-xl font-bold text-slate-900 dark:text-white">{group?.name}</Text>
            {group?.description ? (
              <Text className="text-sm text-slate-500 dark:text-slate-400">{group.description}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={shareInvite}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: '#2563eb', paddingVertical: 10 }}
          >
            <Ionicons name="share-outline" size={16} color="#2563EB" />
            <Text className="text-sm font-semibold text-primary">Invite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/group/${id}/members`)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', paddingVertical: 10,
            }}
          >
            <Ionicons name="people-outline" size={16} color="#64748B" />
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-400">Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/group/${id}/chat`)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: '#2563eb', paddingVertical: 10 }}
          >
            <Ionicons name="chatbubbles-outline" size={16} color="white" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={trips ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: '#2563eb' }} />
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Trips</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/group/${id}/trip/new`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="add-circle" size={18} color="#2563EB" />
              <Text className="text-sm font-semibold text-primary">New Trip</Text>
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
              <Ionicons name="map-outline" size={36} color={isDark ? '#475569' : '#CBD5E1'} />
            </View>
            <Text className="text-base font-bold text-slate-700 dark:text-slate-300">No trips yet</Text>
            <Text className="mt-1 text-sm text-slate-400 dark:text-slate-500">Plan your first adventure together.</Text>
            <TouchableOpacity
              onPress={() => router.push(`/group/${id}/trip/new`)}
              style={{ marginTop: 20, borderRadius: 14, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: 'white' }}>Plan a Trip</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}
