import { View, Text, Image, FlatList, RefreshControl, ScrollView } from 'react-native';
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

const CARD_SHADOW = { shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 };
const CARD_SHADOW_DARK = { shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 };

function GroupCardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#f1f5f9',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Skeleton width={50} height={50} borderRadius={15} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
        <Skeleton width={30} height={30} borderRadius={9} />
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
    const letter = item.name[0].toUpperCase();
    const hues = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
    const color = hues[item.name.charCodeAt(0) % hues.length];
    return (
      <PressableCard
        onPress={() => router.push(`/group/${item.id}`)}
        style={{
          marginBottom: 12,
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#334155' : '#f1f5f9',
          ...(isDark ? CARD_SHADOW_DARK : CARD_SHADOW),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 15,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: color,
              shadowOpacity: 0.4,
              shadowOffset: { width: 0, height: 3 },
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '800', color: 'white' }}>{letter}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{item.name}</Text>
            {item.description ? (
              <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400" numberOfLines={1}>{item.description}</Text>
            ) : (
              <Text className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">Tap to open</Text>
            )}
          </View>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-forward" size={15} color={isDark ? '#94a3b8' : '#94a3b8'} />
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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">

      {/* ── Header ── */}
      <View
        className="border-b border-slate-100 dark:border-slate-800"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 72, height: 52 }}
            resizeMode="contain"
          />
          <View style={{ height: 32, width: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
          <View>
            <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Welcome back
            </Text>
            <Text className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {firstName}
            </Text>
          </View>
        </View>

        <PressableCard
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
        </PressableCard>
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
            <View className="flex-1" style={{ height: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
            <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              Everything you need
            </Text>
            <View className="flex-1" style={{ height: 1, backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
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
                  padding: 16,
                  borderRadius: 18,
                  borderWidth: 1,
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#f1f5f9',
                  shadowColor: '#000',
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
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
          <PressableCard
            onPress={() => router.push('/group/new')}
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
          </PressableCard>

          <PressableCard
            onPress={() => router.push('/trip/new')}
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 16,
              paddingVertical: 15,
              borderWidth: 1,
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderColor: isDark ? '#334155' : '#e2e8f0',
            }}
          >
            <Ionicons name="person-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Plan a Solo Trip</Text>
          </PressableCard>
        </ScrollView>
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            hasGroups ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 16 }}>
                <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: '#2563eb' }} />
                <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Your Groups
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            <View>
              {hasSoloTrips && (
                <View style={{ marginTop: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: '#7c3aed' }} />
                    <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Solo Trips
                    </Text>
                  </View>
                  {soloTrips!.map((trip) => (
                    <PressableCard
                      key={trip.id}
                      onPress={() => router.push(`/trip/${trip.id}`)}
                      style={{
                        marginBottom: 12,
                        borderRadius: 20,
                        padding: 16,
                        borderWidth: 1,
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#f1f5f9',
                        ...(isDark ? CARD_SHADOW_DARK : CARD_SHADOW),
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 15,
                            backgroundColor: '#7c3aed',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#7c3aed',
                            shadowOpacity: 0.4,
                            shadowOffset: { width: 0, height: 3 },
                            shadowRadius: 8,
                            elevation: 4,
                          }}
                        >
                          <Ionicons name="person" size={22} color="white" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{trip.title}</Text>
                          <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            {trip.destination} · {format(new Date(trip.start_date + 'T12:00:00'), 'MMM d')}
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            backgroundColor: isDark ? '#334155' : '#f1f5f9',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
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
                style={{
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 16,
                  paddingVertical: 15,
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Plan a Solo Trip</Text>
              </PressableCard>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
