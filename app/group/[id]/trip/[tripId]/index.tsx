import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { useTrip } from '../../../../../hooks/useTrip';
import { useBudgetSummary } from '../../../../../hooks/useBudget';

const STATUS_COLOR: Record<string, string> = {
  planning: '#F59E0B',
  confirmed: '#2563EB',
  ongoing: '#10B981',
  completed: '#94A3B8',
};

export default function TripScreen() {
  const { id: groupId, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const router = useRouter();
  const { data: trip } = useTrip(tripId);
  const { totalSpent, totalBudget, remaining, percentUsed, byCategory } = useBudgetSummary(tripId);

  if (!trip) return null;

  const days = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1;
  const color = STATUS_COLOR[trip.status];

  const CATEGORY_ICONS: Record<string, string> = {
    food: 'restaurant-outline',
    transport: 'car-outline',
    accommodation: 'bed-outline',
    activities: 'bicycle-outline',
    shopping: 'bag-outline',
    other: 'ellipsis-horizontal-outline',
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <View className="mb-3 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">{trip.title}</Text>
              <View className="mt-1 flex-row items-center gap-1">
                <Ionicons name="location-outline" size={14} color="#94A3B8" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">{trip.destination}</Text>
              </View>
            </View>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${color}20` }}>
              <Text className="text-sm font-semibold capitalize" style={{ color }}>{trip.status}</Text>
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1 rounded-xl bg-slate-50 p-3 dark:bg-gray-700">
              <Text className="text-xs text-gray-400">Start</Text>
              <Text className="font-semibold text-gray-800 dark:text-white">{format(new Date(trip.start_date), 'MMM d, yyyy')}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-slate-50 p-3 dark:bg-gray-700">
              <Text className="text-xs text-gray-400">End</Text>
              <Text className="font-semibold text-gray-800 dark:text-white">{format(new Date(trip.end_date), 'MMM d, yyyy')}</Text>
            </View>
            <View className="items-center justify-center rounded-xl bg-primary/10 px-3">
              <Text className="text-lg font-bold text-primary">{days}</Text>
              <Text className="text-xs text-primary">days</Text>
            </View>
          </View>

          {trip.description ? (
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">{trip.description}</Text>
          ) : null}
        </View>

        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-gray-900 dark:text-white">Budget</Text>
            <TouchableOpacity onPress={() => router.push(`/group/${groupId}/trip/${tripId}/budget`)}>
              <Text className="text-sm font-semibold text-primary">{totalBudget > 0 ? 'Details' : 'Set Budget'}</Text>
            </TouchableOpacity>
          </View>

          {totalBudget > 0 ? (
            <>
              <View className="mb-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(percentUsed, 100)}%`,
                    backgroundColor: percentUsed > 90 ? '#EF4444' : percentUsed > 70 ? '#F59E0B' : '#10B981',
                  }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500 dark:text-gray-400">Spent: <Text className="font-semibold text-gray-800 dark:text-white">${totalSpent.toFixed(2)}</Text></Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">Budget: <Text className="font-semibold text-gray-800 dark:text-white">${totalBudget.toFixed(2)}</Text></Text>
              </View>
              <Text className={`mt-1 text-sm font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {remaining >= 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over budget`}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-gray-400">No budget set yet. Tap "Set Budget" to add one.</Text>
          )}
        </View>

        <View className="mb-4 flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push(`/group/${groupId}/trip/${tripId}/expenses`)}
            className="flex-1 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
            style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
          >
            <Ionicons name="receipt-outline" size={24} color="#2563EB" />
            <Text className="mt-2 font-semibold text-gray-800 dark:text-white">Expenses</Text>
            <Text className="text-sm text-gray-400">Track spending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/group/${groupId}/trip/${tripId}/chat`)}
            className="flex-1 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
            style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#7C3AED" />
            <Text className="mt-2 font-semibold text-gray-800 dark:text-white">Trip Chat</Text>
            <Text className="text-sm text-gray-400">Discuss this trip</Text>
          </TouchableOpacity>
        </View>

        {Object.keys(byCategory).length > 0 && (
          <View className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">Spending by Category</Text>
            {Object.entries(byCategory).map(([cat, amount]) => (
              <View key={cat} className="mb-2 flex-row items-center gap-3">
                <Ionicons name={CATEGORY_ICONS[cat] as any ?? 'ellipsis-horizontal-outline'} size={16} color="#64748B" />
                <Text className="flex-1 capitalize text-gray-700 dark:text-gray-300">{cat}</Text>
                <Text className="font-semibold text-gray-800 dark:text-white">${(amount as number).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => router.push(`/group/${groupId}/trip/${tripId}/add-expense`)}
          className="flex-row items-center gap-2 rounded-2xl bg-primary px-5 py-3 shadow-lg"
          style={{ shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="font-bold text-white">Add Expense</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
