import { View, Text, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
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
        <TouchableOpacity onPress={() => router.push('/group/new')} className="rounded-xl bg-primary px-3 py-2">
          <Ionicons name="add" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {groupsLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading...</Text>
        </View>
      ) : isEmpty ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View className="mt-6 items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-3xl bg-primary"
              style={{ shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 }}
            >
              <Ionicons name="airplane" size={38} color="white" />
            </View>
            <Text className="mt-5 text-center text-2xl font-bold text-gray-900 dark:text-white">
              Plan trips together,{'\n'}effortlessly.
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
              TripCircle helps you organise group adventures and solo getaways — from idea to itinerary.
            </Text>
          </View>

          {/* Feature cards */}
          <View className="mt-8 gap-3">
            <View className="flex-row items-start gap-4 rounded-2xl bg-white p-4 dark:bg-gray-800"
              style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900">
                <Ionicons name="people" size={20} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 dark:text-white">Group Trips</Text>
                <Text className="mt-0.5 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  Create a group, invite friends, and plan together. Everyone stays in the loop.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-4 rounded-2xl bg-white p-4 dark:bg-gray-800"
              style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900">
                <Ionicons name="wallet" size={20} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 dark:text-white">Budget & Expenses</Text>
                <Text className="mt-0.5 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  Track shared costs, split bills fairly, and know exactly who owes what.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-4 rounded-2xl bg-white p-4 dark:bg-gray-800"
              style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900">
                <Ionicons name="person" size={20} color="#7C3AED" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 dark:text-white">Solo Planning</Text>
                <Text className="mt-0.5 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  Going it alone? Build your own itinerary and keep everything in one place.
                </Text>
              </View>
            </View>
          </View>

          {/* CTAs */}
          <TouchableOpacity
            onPress={() => router.push('/group/new')}
            className="mt-8 items-center rounded-2xl bg-primary py-4"
            style={{ shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}
          >
            <Text className="text-base font-bold text-white">Create a Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/trip/new')}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-gray-200 py-4 dark:border-gray-700"
          >
            <Ionicons name="person-outline" size={16} color="#64748B" />
            <Text className="font-semibold text-gray-600 dark:text-gray-300">Plan a Solo Trip</Text>
          </TouchableOpacity>
        </ScrollView>
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
