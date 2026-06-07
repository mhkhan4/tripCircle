import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNearbyGroups, useRequestJoinGroup } from '../../hooks/useDiscover';
import type { NearbyGroup } from '../../types';

const RADIUS_OPTIONS = [25, 50, 100] as const;
type RadiusMiles = (typeof RADIUS_OPTIONS)[number];

export default function DiscoverScreen() {
  const router = useRouter();
  const [radius, setRadius] = useState<RadiusMiles>(25);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { data: groups, isLoading, refetch } = useNearbyGroups(coords?.lat ?? null, coords?.lng ?? null, radius);
  const requestJoin = useRequestJoinGroup();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is required to discover nearby groups.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  async function handleRequestJoin(group: NearbyGroup) {
    Alert.alert(
      `Join "${group.name}"?`,
      'Your request will be sent to the group admin for approval.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            try {
              await requestJoin.mutateAsync({ group_id: group.id });
              Alert.alert('Request Sent', 'The group admin will review your request.');
            } catch (e: any) {
              if (e.message?.includes('duplicate') || e.code === '23505') {
                Alert.alert('Already Requested', 'You already have a pending request for this group.');
              } else {
                Alert.alert('Error', e.message);
              }
            }
          },
        },
      ],
    );
  }

  function renderGroup({ item }: { item: NearbyGroup }) {
    return (
      <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Text className="text-xl font-bold text-white">{item.name[0].toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 dark:text-white">{item.name}</Text>
            <View className="flex-row items-center gap-3 mt-0.5">
              <Text className="text-xs text-gray-400">
                <Ionicons name="people-outline" size={11} /> {item.member_count} {item.member_count === 1 ? 'member' : 'members'}
              </Text>
              <Text className="text-xs text-gray-400">
                <Ionicons name="location-outline" size={11} /> {item.distance_miles.toFixed(1)} mi away
              </Text>
            </View>
            {item.description ? (
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400" numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => handleRequestJoin(item)}
            disabled={requestJoin.isPending}
            className="rounded-xl bg-primary px-3 py-2"
          >
            <Text className="text-xs font-semibold text-white">Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Discover Groups', headerBackTitle: 'Home' }} />

      {/* Radius filter */}
      <View className="px-5 py-3">
        <Text className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Search radius</Text>
        <View className="flex-row gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => { setRadius(r); refetch(); }}
              className="rounded-xl px-4 py-2"
              style={{ backgroundColor: radius === r ? '#2563EB' : '#F1F5F9' }}
            >
              <Text className="text-sm font-semibold" style={{ color: radius === r ? 'white' : '#64748B' }}>
                {r} mi
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {locationError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="location-outline" size={48} color="#CBD5E1" />
          <Text className="mt-3 text-center text-sm text-gray-500">{locationError}</Text>
        </View>
      ) : !coords ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-3 text-sm text-gray-400">Getting your location…</Text>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-3 text-sm text-gray-400">Searching nearby groups…</Text>
        </View>
      ) : !groups?.length ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="search-outline" size={48} color="#CBD5E1" />
          <Text className="mt-3 text-center text-base font-semibold text-gray-700 dark:text-gray-300">No groups nearby</Text>
          <Text className="mt-1 text-center text-sm text-gray-400">
            Try expanding the radius or ask a group admin to make their group discoverable.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListHeaderComponent={
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              {groups.length} group{groups.length !== 1 ? 's' : ''} within {radius} miles
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
