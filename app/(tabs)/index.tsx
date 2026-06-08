import { View, Text, Image, FlatList, TouchableOpacity, RefreshControl, ScrollView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useGroups } from '../../hooks/useGroup';
import { useSoloTrips } from '../../hooks/useTrip';
import { useAppStore } from '../../store/useAppStore';
import type { Group } from '../../types';

const FEATURES = [
  {
    icon: 'people' as const,
    color: '#3b82f6',
    darkBg: '#1e3a8a22',
    lightBg: '#dbeafe',
    darkBorder: '#1e3a8a',
    lightBorder: '#bfdbfe',
    title: 'Group Trips',
    desc: 'Create a group, invite friends, and plan together. Everyone stays in the loop.',
  },
  {
    icon: 'wallet' as const,
    color: '#f59e0b',
    darkBg: '#78350f22',
    lightBg: '#fef3c7',
    darkBorder: '#92400e',
    lightBorder: '#fde68a',
    title: 'Budget & Expenses',
    desc: 'Track shared costs, split bills fairly, and know exactly who owes what.',
  },
  {
    icon: 'compass' as const,
    color: '#10b981',
    darkBg: '#064e3b22',
    lightBg: '#d1fae5',
    darkBorder: '#065f46',
    lightBorder: '#a7f3d0',
    title: 'Solo Planning',
    desc: 'Build your own itinerary and keep everything organised in one place.',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useGroups();
  const { data: soloTrips, refetch: refetchSolo } = useSoloTrips();
  const [refreshing, setRefreshing] = useState(false);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchGroups(), refetchSolo()]);
    setRefreshing(false);
  }

  function renderGroup({ item }: { item: Group }) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/group/${item.id}`)}
        className="mb-3 rounded-2xl bg-white p-4 dark:bg-gray-800"
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

  const firstName = user?.full_name?.split(' ')[0] ?? 'Traveler';
  const initial = firstName[0]?.toUpperCase() ?? 'T';

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950">

      {/* ── Header ── */}
      <View
        className="border-b border-slate-100 dark:border-slate-800"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              backgroundColor: '#2563eb',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#2563eb',
              shadowOpacity: 0.4,
              shadowOffset: { width: 0, height: 3 },
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 17 }}>{initial}</Text>
          </View>
          <View>
            <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Welcome back
            </Text>
            <Text className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {firstName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/group/new')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#2563eb',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#2563eb',
            shadowOpacity: 0.45,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      {groupsLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading...</Text>
        </View>
      ) : isEmpty ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 56 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Ambient glow blobs — dark mode only */}
          {isDark && (
            <>
              <View style={{ position: 'absolute', top: 10, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: '#2563eb', opacity: 0.08 }} />
              <View style={{ position: 'absolute', top: 270, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: '#7c3aed', opacity: 0.07 }} />
              <View style={{ position: 'absolute', top: 560, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: '#0891b2', opacity: 0.06 }} />
            </>
          )}

          {/* Logo */}
          <View style={{ alignItems: 'center', marginTop: 28 }}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 250, height: 182 }}
              resizeMode="contain"
            />
          </View>

          {/* Tagline */}
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <Text className="text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50" style={{ lineHeight: 40 }}>
              Plan trips together,{'\n'}effortlessly.
            </Text>
            <Text className="mt-2.5 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              From idea to itinerary — group adventures{'\n'}and solo getaways, all in one place.
            </Text>
          </View>

          {/* Section divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 36, gap: 10 }}>
            <View className="flex-1" style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
            <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              Everything you need
            </Text>
            <View className="flex-1" style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
          </View>

          {/* Feature cards */}
          <View style={{ marginTop: 16, gap: 10 }}>
            {FEATURES.map((f) => (
              <View
                key={f.title}
                className="rounded-[18px] border border-slate-100 bg-white dark:border-slate-800 dark:bg-gray-900"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                  shadowColor: '#000', shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 2 }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: isDark ? f.darkBg : f.lightBg,
                    borderWidth: 1,
                    borderColor: isDark ? f.darkBorder : f.lightBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={f.icon} size={21} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">{f.title}</Text>
                  <Text className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <TouchableOpacity
            onPress={() => router.push('/group/new')}
            activeOpacity={0.8}
            style={{
              marginTop: 32,
              alignItems: 'center',
              borderRadius: 16,
              backgroundColor: '#2563eb',
              paddingVertical: 17,
              shadowColor: '#2563eb',
              shadowOpacity: 0.45,
              shadowOffset: { width: 0, height: 6 },
              shadowRadius: 16,
              elevation: 7,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: 'white', letterSpacing: 0.2 }}>Create a Group</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/trip/new')}
            activeOpacity={0.75}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700"
            style={{ paddingVertical: 15 }}
          >
            <Ionicons name="person-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Plan a Solo Trip</Text>
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
                      className="mb-3 rounded-2xl bg-white p-4 dark:bg-gray-800"
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
