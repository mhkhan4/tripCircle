import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { useTrip } from '../../../hooks/useTrip';
import { useBudgetSummary } from '../../../hooks/useBudget';
import { useTripTasks } from '../../../hooks/useTask';
import { useTripItinerary } from '../../../hooks/useItinerary';
import { useTheme } from '../../../hooks/useTheme';
import { PressableCard } from '../../../components/ui/PressableCard';

const STATUS_COLOR: Record<string, string> = {
  planning: '#F59E0B',
  confirmed: '#2563EB',
  ongoing: '#10B981',
  completed: '#94A3B8',
};

const CATEGORY_ICONS: Record<string, string> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  accommodation: 'bed-outline',
  activities: 'bicycle-outline',
  shopping: 'bag-outline',
  other: 'ellipsis-horizontal-outline',
};

export default function SoloTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const { data: trip } = useTrip(tripId);
  const { totalSpent, totalBudget, remaining, percentUsed, byCategory } = useBudgetSummary(tripId);
  const { data: tasks } = useTripTasks(tripId);
  const { data: itinerary } = useTripItinerary(tripId);

  const pendingTaskCount = tasks?.filter((t) => !t.completed_at).length ?? 0;
  const itineraryCount = itinerary?.length ?? 0;

  if (!trip) return null;

  const days = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1;
  const color = STATUS_COLOR[trip.status];

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-slate-950/60" edges={['bottom']}>
      <Stack.Screen options={{ title: trip.title }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}>

        {/* Trip header */}
        <View className="mb-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <View className="flex-row items-start justify-between gap-4 mb-5">
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">{trip.title}</Text>
              <View className="mt-2 flex-row items-center gap-1.5">
                <Ionicons name="location-outline" size={14} color="#94A3B8" />
                <Text className="text-xs font-semibold tracking-wider uppercase text-slate-400">{trip.destination}</Text>
              </View>
            </View>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${color}15` }}>
              <Text className="text-xs font-bold capitalize" style={{ color }}>{trip.status}</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-950/20">
              <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Start</Text>
              <Text className="mt-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                {format(new Date(trip.start_date + 'T12:00:00'), 'MMM d, yyyy')}
              </Text>
            </View>
            <View className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-950/20">
              <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">End</Text>
              <Text className="mt-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                {format(new Date(trip.end_date + 'T12:00:00'), 'MMM d, yyyy')}
              </Text>
            </View>
            <View className="items-center justify-center rounded-xl px-4 bg-slate-900 dark:bg-white">
              <Text className="text-lg font-bold text-white dark:text-slate-900">{days}</Text>
              <Text className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold tracking-wider uppercase">days</Text>
            </View>
          </View>

          {trip.description ? (
            <Text className="mt-4 text-sm leading-relaxed text-slate-500">{trip.description}</Text>
          ) : null}
        </View>

        {/* Budget */}
        <View className="mb-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Budget</Text>
            <TouchableOpacity
              onPress={() => router.push(`/trip/${tripId}/budget`)}
              activeOpacity={0.9}
              className="transition-all duration-200 active:scale-95"
            >
              <Text className="text-sm font-bold text-primary">{totalBudget > 0 ? 'Details' : 'Set Budget'}</Text>
            </TouchableOpacity>
          </View>

          {totalBudget > 0 ? (
            <>
              <View className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <View
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    width: `${Math.min(percentUsed, 100)}%`,
                    backgroundColor: percentUsed > 90 ? '#EF4444' : percentUsed > 70 ? '#F59E0B' : '#10B981',
                  }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">
                  Spent: <Text className="font-bold text-slate-850 dark:text-slate-200">${totalSpent.toFixed(2)}</Text>
                </Text>
                <Text className="text-sm text-slate-500">
                  Budget: <Text className="font-bold text-slate-850 dark:text-slate-200">${totalBudget.toFixed(2)}</Text>
                </Text>
              </View>
              <Text className={`mt-2 text-sm font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {remaining >= 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over budget`}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-slate-500">No budget set yet. Tap "Set Budget" to add one.</Text>
          )}
        </View>

        {/* Expenses */}
        <PressableCard
          onPress={() => router.push(`/trip/${tripId}/expenses`)}
          className="mb-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/50"
        >
          <View className="flex-row items-center gap-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <Ionicons name="receipt-outline" size={20} color={isDark ? '#ffffff' : '#0f172a'} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-900 dark:text-slate-100 text-sm">Expenses</Text>
              <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase mt-1">Track Spent</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
          </View>
        </PressableCard>

        {/* Tasks & Itinerary */}
        <View className="flex-row gap-4 mb-6">
          <PressableCard
            onPress={() => router.push(`/trip/${tripId}/tasks`)}
            className="flex-1 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/50"
          >
            <View className="flex-row items-center justify-between">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <Ionicons name="checkbox-outline" size={20} color={isDark ? '#ffffff' : '#0f172a'} />
              </View>
              {pendingTaskCount > 0 && (
                <View className="rounded-full bg-emerald-500/10 px-2 py-0.5">
                  <Text className="text-xs font-bold text-emerald-600">{pendingTaskCount}</Text>
                </View>
              )}
            </View>
            <Text className="mt-3 font-bold text-slate-900 dark:text-slate-100 text-sm">Tasks</Text>
            <Text className="mt-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">
              {pendingTaskCount > 0 ? `${pendingTaskCount} left` : 'Checklist'}
            </Text>
          </PressableCard>

          <PressableCard
            onPress={() => router.push(`/trip/${tripId}/itinerary`)}
            className="flex-1 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/50"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <Ionicons name="map-outline" size={20} color={isDark ? '#ffffff' : '#0f172a'} />
            </View>
            <Text className="mt-3 font-bold text-slate-900 dark:text-slate-100 text-sm">Itinerary</Text>
            <Text className="mt-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">
              {itineraryCount > 0 ? `${itineraryCount} plans` : 'Empty'}
            </Text>
          </PressableCard>
        </View>

        {/* Spending by category */}
        {Object.keys(byCategory).length > 0 && (
          <View className="mb-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
            <Text className="mb-4 text-slate-400 text-xs font-semibold tracking-wider uppercase">Spending by Category</Text>
            {Object.entries(byCategory).map(([cat, amount]) => (
              <View key={cat} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <Ionicons name={CATEGORY_ICONS[cat] as any ?? 'ellipsis-horizontal-outline'} size={15} color="#64748B" />
                </View>
                <Text className="flex-1 capitalize text-slate-700 dark:text-slate-350">{cat}</Text>
                <Text className="font-bold text-slate-900 dark:text-white">${(amount as number).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => router.push(`/trip/${tripId}/add-expense`)}
          activeOpacity={0.9}
          className="flex-row items-center gap-2 rounded-full bg-slate-900 px-6 py-4 shadow-md transition-all duration-200 active:scale-95 dark:bg-white"
        >
          <Ionicons name="add" size={20} color={isDark ? '#0f172a' : 'white'} />
          <Text className="font-bold text-white dark:text-slate-900">Add Expense</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
