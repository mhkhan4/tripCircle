import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useGroups } from '../../hooks/useGroup';
import { useSoloTrips } from '../../hooks/useTrip';
import { useAppStore } from '../../store/useAppStore';
import type { Group } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useGroups();
  const { data: soloTrips, refetch: refetchSolo } = useSoloTrips();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchGroups(), refetchSolo()]);
    setRefreshing(false);
  }

  function renderGroup({ item }: { item: Group }) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/group/${item.id}`)}
        className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
        style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Text className="text-xl font-bold text-white">{item.name[0].toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 dark:text-white">{item.name}</Text>
            {item.description ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  }

  const hasGroups = !!groups?.length;
  const hasSoloTrips = !!soloTrips?.length;
  const isEmpty = !hasGroups && !hasSoloTrips;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950">
      <View className="flex-row items-center justify-between px-5 py-4">
        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-400">Welcome back,</Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">{user?.full_name?.split(' ')[0] ?? 'Traveler'}</Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => router.push('/discover')}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          >
            <Text className="text-sm font-semibold text-primary">Join</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/group/new')} className="rounded-xl bg-primary px-3 py-2">
            <Ionicons name="add" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {groupsLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading...</Text>
        </View>
      ) : isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text className="mt-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">No trips yet</Text>
          <Text className="mt-1 text-center text-sm text-gray-400">Create a group, discover one nearby, or plan a solo trip.</Text>
          <TouchableOpacity onPress={() => router.push('/group/new')} className="mt-6 rounded-2xl bg-primary px-6 py-3">
            <Text className="font-semibold text-white">Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/discover')} className="mt-3 rounded-2xl border border-primary px-6 py-3">
            <Text className="font-semibold text-primary">Discover Nearby Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/trip/new')}
            className="mt-3 flex-row items-center gap-2 rounded-2xl border border-gray-200 px-6 py-3 dark:border-gray-700"
          >
            <Ionicons name="person-outline" size={16} color="#64748B" />
            <Text className="font-semibold text-gray-600 dark:text-gray-300">Plan a Solo Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            hasGroups ? (
              <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Your Groups</Text>
            ) : null
          }
          ListFooterComponent={
            <View>
              {hasSoloTrips && (
                <View className="mt-2">
                  <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Solo Trips</Text>
                  {soloTrips!.map((trip) => (
                    <TouchableOpacity
                      key={trip.id}
                      onPress={() => router.push(`/trip/${trip.id}`)}
                      className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
                      style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="h-12 w-12 items-center justify-center rounded-xl bg-indigo-500">
                          <Ionicons name="person" size={22} color="white" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-bold text-gray-900 dark:text-white">{trip.title}</Text>
                          <Text className="text-sm text-gray-500 dark:text-gray-400">
                            {trip.destination} · {format(new Date(trip.start_date + 'T12:00:00'), 'MMM d')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => router.push('/trip/new')}
                className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-3 dark:border-gray-600"
              >
                <Ionicons name="person-outline" size={16} color="#64748B" />
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">Plan a Solo Trip</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
