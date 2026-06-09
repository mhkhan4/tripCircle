import { View, Text, ScrollView } from 'react-native';
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

  const card = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#f1f5f9',
    shadowColor: '#000' as const,
    shadowOpacity: isDark ? 0.25 : 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['bottom']}>
      <Stack.Screen options={{ title: trip.title }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>

        {/* Trip header */}
        <View style={{ ...card, marginBottom: 16, borderRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text className="text-xl font-bold text-slate-900 dark:text-white">{trip.title}</Text>
              <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={14} color="#94A3B8" />
                <Text className="text-sm text-slate-500 dark:text-slate-400">{trip.destination}</Text>
              </View>
            </View>
            <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: `${color}20` }}>
              <Text style={{ fontSize: 13, fontWeight: '600', textTransform: 'capitalize', color }}>{trip.status}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, borderRadius: 12, padding: 12, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
              <Text className="text-xs text-slate-400">Start</Text>
              <Text className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                {format(new Date(trip.start_date + 'T12:00:00'), 'MMM d, yyyy')}
              </Text>
            </View>
            <View style={{ flex: 1, borderRadius: 12, padding: 12, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
              <Text className="text-xs text-slate-400">End</Text>
              <Text className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                {format(new Date(trip.end_date + 'T12:00:00'), 'MMM d, yyyy')}
              </Text>
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#2563eb14' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#2563eb' }}>{days}</Text>
              <Text style={{ fontSize: 11, color: '#2563eb' }}>days</Text>
            </View>
          </View>

          {trip.description ? (
            <Text className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{trip.description}</Text>
          ) : null}
        </View>

        {/* Budget */}
        <View style={{ ...card, marginBottom: 16, borderRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text className="text-base font-bold text-slate-900 dark:text-white">Budget</Text>
            <PressableCard onPress={() => router.push(`/trip/${tripId}/budget`)}>
              <Text className="text-sm font-semibold text-primary">{totalBudget > 0 ? 'Details' : 'Set Budget'}</Text>
            </PressableCard>
          </View>

          {totalBudget > 0 ? (
            <>
              <View style={{ marginBottom: 8, height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: isDark ? '#334155' : '#f1f5f9' }}>
                <View
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    width: `${Math.min(percentUsed, 100)}%`,
                    backgroundColor: percentUsed > 90 ? '#EF4444' : percentUsed > 70 ? '#F59E0B' : '#10B981',
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text className="text-sm text-slate-500 dark:text-slate-400">
                  Spent: <Text className="font-semibold text-slate-800 dark:text-white">${totalSpent.toFixed(2)}</Text>
                </Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400">
                  Budget: <Text className="font-semibold text-slate-800 dark:text-white">${totalBudget.toFixed(2)}</Text>
                </Text>
              </View>
              <Text className={`mt-1 text-sm font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {remaining >= 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over budget`}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-slate-400">No budget set yet. Tap "Set Budget" to add one.</Text>
          )}
        </View>

        {/* Expenses */}
        <PressableCard
          onPress={() => router.push(`/trip/${tripId}/expenses`)}
          style={{ ...card, marginBottom: 16, borderRadius: 20, padding: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#2563eb14', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="receipt-outline" size={22} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="font-bold text-slate-800 dark:text-white">Expenses</Text>
              <Text className="text-sm text-slate-400 dark:text-slate-500">Track your spending</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
          </View>
        </PressableCard>

        {/* Tasks & Itinerary */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <PressableCard
            onPress={() => router.push(`/trip/${tripId}/tasks`)}
            style={{ ...card, flex: 1, borderRadius: 20, padding: 16 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b98114', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkbox-outline" size={22} color="#10B981" />
              </View>
              {pendingTaskCount > 0 && (
                <View style={{ borderRadius: 999, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a' }}>{pendingTaskCount}</Text>
                </View>
              )}
            </View>
            <Text className="mt-2 font-bold text-slate-800 dark:text-white">Tasks</Text>
            <Text className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
              {pendingTaskCount > 0 ? `${pendingTaskCount} to do` : 'Checklist'}
            </Text>
          </PressableCard>

          <PressableCard
            onPress={() => router.push(`/trip/${tripId}/itinerary`)}
            style={{ ...card, flex: 1, borderRadius: 20, padding: 16 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#ef444414', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="map-outline" size={22} color="#EF4444" />
            </View>
            <Text className="mt-2 font-bold text-slate-800 dark:text-white">Itinerary</Text>
            <Text className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
              {itineraryCount > 0 ? `${itineraryCount} entries` : 'Bookings & plans'}
            </Text>
          </PressableCard>
        </View>

        {/* Spending by category */}
        {Object.keys(byCategory).length > 0 && (
          <View style={{ ...card, borderRadius: 20, padding: 16 }}>
            <Text className="mb-3 text-base font-bold text-slate-900 dark:text-white">Spending by Category</Text>
            {Object.entries(byCategory).map(([cat, amount]) => (
              <View key={cat} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: isDark ? '#334155' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={CATEGORY_ICONS[cat] as any ?? 'ellipsis-horizontal-outline'} size={15} color="#64748B" />
                </View>
                <Text className="flex-1 capitalize text-slate-700 dark:text-slate-300">{cat}</Text>
                <Text className="font-semibold text-slate-800 dark:text-white">${(amount as number).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <View style={{ position: 'absolute', bottom: 24, right: 20 }}>
        <PressableCard
          onPress={() => router.push(`/trip/${tripId}/add-expense`)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 16,
            backgroundColor: '#2563eb',
            paddingHorizontal: 20,
            paddingVertical: 14,
            shadowColor: '#2563EB',
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: 'white' }}>Add Expense</Text>
        </PressableCard>
      </View>
    </SafeAreaView>
  );
}
