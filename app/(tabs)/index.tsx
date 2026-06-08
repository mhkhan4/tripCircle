import { View, Text, Image, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
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
    glowColor: '#1d4ed822',
    borderColor: '#1e3a8a',
    title: 'Group Trips',
    desc: 'Create a group, invite friends, and plan together. Everyone stays in the loop.',
  },
  {
    icon: 'wallet' as const,
    color: '#f59e0b',
    glowColor: '#78350f22',
    borderColor: '#92400e',
    title: 'Budget & Expenses',
    desc: 'Track shared costs, split bills fairly, and know exactly who owes what.',
  },
  {
    icon: 'compass' as const,
    color: '#10b981',
    glowColor: '#064e3b22',
    borderColor: '#065f46',
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

  const firstName = user?.full_name?.split(' ')[0] ?? 'Traveler';
  const initial = firstName[0]?.toUpperCase() ?? 'T';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isEmpty ? '#080f1e' : undefined }}
      className={isEmpty ? undefined : 'flex-1 bg-slate-50 dark:bg-gray-950'}
    >
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 13,
          borderBottomWidth: 1,
          borderBottomColor: isEmpty ? '#0f172a' : '#f1f5f9',
        }}
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
              shadowOpacity: 0.45,
              shadowOffset: { width: 0, height: 3 },
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 17 }}>{initial}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: isEmpty ? '#475569' : '#94a3b8', textTransform: 'uppercase' }}>
              Welcome back
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: isEmpty ? '#f1f5f9' : '#0f172a' }}>
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
            shadowOpacity: 0.5,
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#64748b' }}>Loading...</Text>
        </View>
      ) : isEmpty ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 56 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#080f1e' }}
        >
          {/* Decorative ambient glows */}
          <View style={{ position: 'absolute', top: 10, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: '#2563eb', opacity: 0.09 }} />
          <View style={{ position: 'absolute', top: 260, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: '#7c3aed', opacity: 0.08 }} />
          <View style={{ position: 'absolute', top: 560, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: '#0891b2', opacity: 0.07 }} />

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
            <Text style={{ fontSize: 31, fontWeight: '800', color: '#f8fafc', textAlign: 'center', lineHeight: 40, letterSpacing: -0.6 }}>
              Plan trips together,{'\n'}effortlessly.
            </Text>
            <Text style={{ marginTop: 10, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, letterSpacing: 0.1 }}>
              From idea to itinerary — group adventures{'\n'}and solo getaways, all in one place.
            </Text>
          </View>

          {/* Divider with label */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 36, gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1e293b' }} />
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: '#334155', textTransform: 'uppercase' }}>Everything you need</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1e293b' }} />
          </View>

          {/* Feature cards */}
          <View style={{ marginTop: 16, gap: 10 }}>
            {FEATURES.map((f) => (
              <View
                key={f.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  backgroundColor: '#0d1829',
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#1a2744',
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: f.glowColor,
                    borderWidth: 1,
                    borderColor: f.borderColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={f.icon} size={21} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: '#e2e8f0', letterSpacing: -0.1 }}>{f.title}</Text>
                  <Text style={{ marginTop: 3, fontSize: 13, lineHeight: 19, color: '#475569' }}>{f.desc}</Text>
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
              shadowOpacity: 0.5,
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 18,
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: 'white', letterSpacing: 0.2 }}>Create a Group</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/trip/new')}
            activeOpacity={0.75}
            style={{
              marginTop: 11,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#1e293b',
              paddingVertical: 15,
            }}
          >
            <Ionicons name="person-outline" size={16} color="#64748b" />
            <Text style={{ fontWeight: '600', color: '#94a3b8', fontSize: 15 }}>Plan a Solo Trip</Text>
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
