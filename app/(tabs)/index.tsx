import { View, Text, Image, FlatList, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useGroups } from '../../hooks/useGroup';
import { useSoloTrips } from '../../hooks/useTrip';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../hooks/useTheme';
import { PressableCard } from '../../components/ui/PressableCard';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Group } from '../../types';

const FEATURES = [
  {
    icon: 'people' as const,
    color: '#0f172a',
    darkBg: '#1e293b',
    lightBg: '#f8fafc',
    darkBorder: '#334155',
    lightBorder: '#f1f5f9',
    title: 'Group Trips',
    desc: 'Create a group, invite friends, and plan together. Everyone stays in the loop.',
  },
  {
    icon: 'wallet' as const,
    color: '#0f172a',
    darkBg: '#1e293b',
    lightBg: '#f8fafc',
    darkBorder: '#334155',
    lightBorder: '#f1f5f9',
    title: 'Budget & Expenses',
    desc: 'Track shared costs, split bills fairly, and know exactly who owes what.',
  },
  {
    icon: 'compass' as const,
    color: '#0f172a',
    darkBg: '#1e293b',
    lightBg: '#f8fafc',
    darkBorder: '#334155',
    lightBorder: '#f1f5f9',
    title: 'Solo Planning',
    desc: 'Build your own itinerary and keep everything organised in one place.',
  },
];

function GroupCardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <View className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
      <View className="flex-row items-center gap-4">
        <Skeleton width={44} height={44} borderRadius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
        <Skeleton width={30} height={30} borderRadius={8} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useGroups();
  const { data: soloTrips, refetch: refetchSolo } = useSoloTrips();
  const [refreshing, setRefreshing] = useState(false);
  const { isDark } = useTheme();

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchGroups(), refetchSolo()]);
    setRefreshing(false);
  }

  function renderGroup({ item }: { item: Group }) {
    const letter = item.name[0]?.toUpperCase() ?? '?';
    const hues = ['#0f172a', '#334155', '#475569', '#1e293b'];
    const color = hues[item.name.charCodeAt(0) % hues.length];
    return (
      <PressableCard
        onPress={() => router.push(`/group/${item.id}`)}
        className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/50"
      >
        <View className="flex-row items-center gap-4">
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: 'white' }}>{letter}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{item.name}</Text>
            {item.description ? (
              <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400" numberOfLines={1}>{item.description}</Text>
            ) : (
              <Text className="mt-1 text-xs font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">Tap to open</Text>
            )}
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <Ionicons name="chevron-forward" size={15} color={isDark ? '#94a3b8' : '#64748b'} />
          </View>
        </View>
      </PressableCard>
    );
  }

  const hasGroups = !!groups?.length;
  const hasSoloTrips = !!soloTrips?.length;
  const isEmpty = !hasGroups && !hasSoloTrips;

  const firstName = user?.full_name?.split(' ')[0] ?? 'Traveler';

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-slate-950/60">

      {/* ── Header ── */}
      <View
        className="border-b border-slate-100 dark:border-slate-900 px-5 py-4"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 64, height: 44 }}
            resizeMode="contain"
          />
          <View style={{ height: 24, width: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
          <View>
            <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
              Welcome back
            </Text>
            <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
              {firstName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/group/new')}
          activeOpacity={0.9}
          className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white items-center justify-center transition-all duration-200 active:scale-95 shadow-sm"
        >
          <Ionicons name="add" size={20} color={isDark ? '#0f172a' : 'white'} />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      {groupsLoading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {[1, 2, 3].map((i) => <GroupCardSkeleton key={i} isDark={isDark} />)}
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
              <View style={{ position: 'absolute', top: 10, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: '#0f172a', opacity: 0.1 }} />
              <View style={{ position: 'absolute', top: 270, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: '#1e293b', opacity: 0.08 }} />
            </>
          )}

          {/* Logo */}
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 200, height: 140 }}
              resizeMode="contain"
            />
          </View>

          {/* Tagline */}
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <Text className="text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50" style={{ lineHeight: 34 }}>
              Plan trips together,{'\n'}effortlessly.
            </Text>
            <Text className="mt-3 text-center text-sm leading-relaxed text-slate-500">
              From idea to itinerary — group adventures{'\n'}and solo getaways, all in one place.
            </Text>
          </View>

          {/* Section divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 40, gap: 10 }}>
            <View className="flex-1" style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
            <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
              Everything you need
            </Text>
            <View className="flex-1" style={{ height: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }} />
          </View>

          {/* Feature cards */}
          <View className="mt-6 gap-4">
            {FEATURES.map((f) => (
              <View
                key={f.title}
                className="flex-row items-center gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: isDark ? f.darkBg : f.lightBg,
                    borderWidth: 1,
                    borderColor: isDark ? f.darkBorder : f.lightBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={f.icon} size={20} color={isDark ? '#cbd5e1' : f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">{f.title}</Text>
                  <Text className="mt-1 text-xs leading-relaxed text-slate-500">{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <PressableCard
            onPress={() => router.push('/group/new')}
            className="mt-8 items-center justify-center rounded-xl bg-slate-900 py-4.5 shadow-sm transition-all duration-200 active:scale-95 dark:bg-white"
          >
            <Text className="text-base font-bold text-white dark:text-slate-900">Create a Group</Text>
          </PressableCard>

          <PressableCard
            onPress={() => router.push('/trip/new')}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-4 shadow-sm transition-all duration-200 active:scale-95 dark:border-slate-850 dark:bg-slate-900/40"
          >
            <Ionicons name="person-outline" size={16} color={isDark ? '#cbd5e1' : '#475569'} />
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Plan a Solo Trip</Text>
          </PressableCard>
        </ScrollView>
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            hasGroups ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 16 }}>
                <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: '#0f172a' }} />
                <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
                  Your Groups
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            <View>
              {hasSoloTrips && (
                <View className="mt-8">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: '#475569' }} />
                    <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
                      Solo Trips
                    </Text>
                  </View>
                  {soloTrips!.map((trip) => (
                    <PressableCard
                      key={trip.id}
                      onPress={() => router.push(`/trip/${trip.id}`)}
                      className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/50"
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: '#475569',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="person" size={20} color="white" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{trip.title}</Text>
                          <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase mt-1">
                            {trip.destination} · {format(new Date(trip.start_date + 'T12:00:00'), 'MMM d')}
                          </Text>
                        </View>
                        <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800/60">
                          <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
                        </View>
                      </View>
                    </PressableCard>
                  ))}
                </View>
              )}

              {/* Plan solo trip CTA */}
              <PressableCard
                onPress={() => router.push('/trip/new')}
                className="mt-6 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-4 shadow-sm transition-all duration-200 active:scale-95 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <Ionicons name="add-circle-outline" size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                <Text className="text-sm font-semibold text-slate-600 dark:text-slate-350">Plan a Solo Trip</Text>
              </PressableCard>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
