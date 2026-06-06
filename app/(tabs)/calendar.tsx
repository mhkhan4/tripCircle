import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, isAfter, isBefore, isToday } from 'date-fns';
import { useAllTrips } from '../../hooks/useTrip';
import type { Trip } from '../../types';

const STATUS_COLOR: Record<string, string> = {
  planning: '#F59E0B',
  confirmed: '#2563EB',
  ongoing: '#10B981',
  completed: '#94A3B8',
};

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const color = STATUS_COLOR[trip.status];

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
      style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 dark:text-white">{trip.title}</Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">{trip.destination}</Text>
          </View>
        </View>
        <View className="rounded-full px-2 py-1" style={{ backgroundColor: `${color}20` }}>
          <Text className="text-xs font-semibold capitalize" style={{ color }}>
            {trip.status}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center gap-1">
        <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { data: trips, isLoading } = useAllTrips();

  const upcoming = trips?.filter((t) => isAfter(new Date(t.start_date), new Date()) || isToday(new Date(t.start_date))) ?? [];
  const past = trips?.filter((t) => isBefore(new Date(t.end_date), new Date()) && !isToday(new Date(t.end_date))) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950">
      <View className="px-5 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">All your upcoming adventures</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading trips...</Text>
        </View>
      ) : !trips?.length ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
          <Text className="mt-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">No trips yet</Text>
          <Text className="mt-1 text-center text-sm text-gray-400">
            Create a group and plan your first trip.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...upcoming, ...past]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => router.push(`/group/${item.group_id}/trip/${item.id}`)}
            />
          )}
          ListHeaderComponent={
            upcoming.length > 0 ? (
              <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Upcoming ({upcoming.length})
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
