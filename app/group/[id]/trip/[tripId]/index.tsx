import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, isPast } from 'date-fns';
import { useTrip, useTripMembers, useJoinTrip, useLeaveTrip, useRemoveTripMember, useUpdateTripMemberRole } from '../../../../../hooks/useTrip';
import { useBudgetSummary } from '../../../../../hooks/useBudget';
import { useTripPolls } from '../../../../../hooks/usePoll';
import { useTripTasks } from '../../../../../hooks/useTask';
import { useTripItinerary } from '../../../../../hooks/useItinerary';
import { useAppStore } from '../../../../../store/useAppStore';
import { useTheme } from '../../../../../hooks/useTheme';
import { PressableCard } from '../../../../../components/ui/PressableCard';
import TripMemberRow from '../../../../../components/TripMemberRow';

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

export default function TripScreen() {
  const { id: groupId, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const router = useRouter();
  const { user } = useAppStore();
  const { isDark } = useTheme();
  const { data: trip } = useTrip(tripId);
  const { data: tripMembers } = useTripMembers(tripId);
  const { totalSpent, totalBudget, remaining, percentUsed, byCategory } = useBudgetSummary(tripId);
  const { data: polls } = useTripPolls(tripId);
  const { data: tasks } = useTripTasks(tripId);
  const { data: itinerary } = useTripItinerary(tripId);

  const openPollCount = polls?.filter((p) => !isPast(new Date(p.closes_at))).length ?? 0;
  const pendingTaskCount = tasks?.filter((t) => !t.completed_at).length ?? 0;
  const itineraryCount = itinerary?.length ?? 0;
  const joinTrip = useJoinTrip();
  const leaveTrip = useLeaveTrip();
  const removeMember = useRemoveTripMember();
  const updateMemberRole = useUpdateTripMemberRole();

  if (!trip) return null;

  const days = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1;
  const color = STATUS_COLOR[trip.status];
  const isMember = tripMembers?.some((m) => m.user_id === user?.id) ?? false;
  const isCreator = trip.created_by === user?.id;
  const myMembership = tripMembers?.find((m) => m.user_id === user?.id);
  const isTripAdmin = isCreator || myMembership?.role === 'admin';

  async function handleJoin() {
    try {
      await joinTrip.mutateAsync({ tripId, groupId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleLeave() {
    Alert.alert(
      'Leave trip',
      'Are you sure you want to leave this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveTrip.mutateAsync({ tripId, groupId });
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  async function handleToggleAdmin(membershipId: string, currentRole: 'admin' | 'member') {
    try {
      await updateMemberRole.mutateAsync({ membershipId, tripId, role: currentRole === 'admin' ? 'member' : 'admin' });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleRemoveMember(membershipId: string) {
    try {
      await removeMember.mutateAsync({ membershipId, tripId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: trip.title }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}>

        {/* Trip header */}
        <View className="mb-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
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
            <View className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Start</Text>
              <Text className="mt-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                {format(new Date(trip.start_date + 'T12:00:00'), 'MMM d, yyyy')}
              </Text>
            </View>
            <View className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">End</Text>
              <Text className="mt-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                {format(new Date(trip.end_date + 'T12:00:00'), 'MMM d, yyyy')}
              </Text>
            </View>
            <View className="items-center justify-center rounded-xl px-4 bg-slate-900 dark:bg-white">
              <Text className="text-lg font-bold text-white dark:text-slate-900">{days}</Text>
              <Text className="text-slate-400 dark:text-gray-500 text-[10px] font-semibold tracking-wider uppercase">days</Text>
            </View>
          </View>

          {trip.description ? (
            <Text className="mt-4 text-sm leading-relaxed text-slate-500">{trip.description}</Text>
          ) : null}
        </View>

        {/* Budget */}
        <View className="mb-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Budget</Text>
            <TouchableOpacity
              onPress={() => router.push(`/group/${groupId}/trip/${tripId}/budget`)}
              activeOpacity={0.9}
              className="transition-all duration-200 active:scale-95"
            >
              <Text className="text-sm font-bold text-primary">{totalBudget > 0 ? 'Details' : 'Set Budget'}</Text>
            </TouchableOpacity>
          </View>

          {totalBudget > 0 ? (
            <>
              <View className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700">
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

        {/* Expenses + Chat */}
        <View className="flex-row gap-4 mb-6">
          <PressableCard
            onPress={() => router.push(`/group/${groupId}/trip/${tripId}/expenses`)}
            className="flex-1 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800">
              <Ionicons name="receipt-outline" size={20} color={isDark ? '#ffffff' : '#0f172a'} />
            </View>
            <Text className="mt-3 font-bold text-slate-900 dark:text-white text-sm">Expenses</Text>
            <Text className="mt-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">Track Spent</Text>
          </PressableCard>

          <PressableCard
            onPress={() => router.push(`/group/${groupId}/trip/${tripId}/chat`)}
            className="flex-1 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800">
              <Ionicons name="chatbubbles-outline" size={20} color={isDark ? '#ffffff' : '#0f172a'} />
            </View>
            <Text className="mt-3 font-bold text-slate-900 dark:text-white text-sm">Trip Chat</Text>
            <Text className="mt-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">Discuss</Text>
          </PressableCard>
        </View>

        {/* Polls · Tasks · Itinerary */}
        <View className="flex-row gap-4 mb-6">
          <PressableCard
            onPress={() => router.push(`/group/${groupId}/trip/${tripId}/polls`)}
            className="flex-1 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <View className="flex-row items-center justify-between">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800">
                <Ionicons name="stats-chart-outline" size={20} color={isDark ? '#ffffff' : '#0f172a'} />
              </View>
              {openPollCount > 0 && (
                <View className="rounded-full bg-amber-500/10 px-2 py-0.5">
                  <Text className="text-xs font-bold text-amber-600">{openPollCount}</Text>
                </View>
              )}
            </View>
            <Text className="mt-3 font-bold text-slate-900 dark:text-white text-sm">Polls</Text>
            <Text className="mt-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">
              {openPollCount > 0 ? `${openPollCount} open` : 'Vote'}
            </Text>
          </PressableCard>

          <PressableCard
            onPress={() => router.push(`/group/${groupId}/trip/${tripId}/tasks`)}
            className="flex-1 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <View className="flex-row items-center justify-between">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800">
                <Ionicons name="checkbox-outline" size={20} color={isDark ? '#ffffff' : '#0f172a'} />
              </View>
              {pendingTaskCount > 0 && (
                <View className="rounded-full bg-emerald-500/10 px-2 py-0.5">
                  <Text className="text-xs font-bold text-emerald-600">{pendingTaskCount}</Text>
                </View>
              )}
            </View>
            <Text className="mt-3 font-bold text-slate-900 dark:text-white text-sm">Tasks</Text>
            <Text className="mt-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">
              {pendingTaskCount > 0 ? `${pendingTaskCount} left` : 'To Do'}
            </Text>
          </PressableCard>

          <PressableCard
            onPress={() => router.push(`/group/${groupId}/trip/${tripId}/itinerary`)}
            className="flex-1 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800">
              <Ionicons name="map-outline" size={20} color={isDark ? '#ffffff' : '#0f172a'} />
            </View>
            <Text className="mt-3 font-bold text-slate-900 dark:text-white text-sm">Itinerary</Text>
            <Text className="mt-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">
              {itineraryCount > 0 ? `${itineraryCount} plans` : 'Empty'}
            </Text>
          </PressableCard>
        </View>

        {/* Members */}
        <View className="mb-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <Text className="mb-4 text-slate-400 text-xs font-semibold tracking-wider uppercase">
            Members · {tripMembers?.length ?? 0}
          </Text>
          {isMember ? (
            <>
              {tripMembers?.map((m) => (
                <TripMemberRow
                  key={m.id}
                  member={m}
                  isCurrentUser={m.user_id === user?.id}
                  currentUserIsAdmin={isTripAdmin}
                  isCreator={m.user_id === trip.created_by}
                  onRemove={isTripAdmin ? handleRemoveMember : undefined}
                  onToggleAdmin={isTripAdmin ? handleToggleAdmin : undefined}
                />
              ))}
              {!isCreator && (
                <TouchableOpacity
                  onPress={handleLeave}
                  disabled={leaveTrip.isPending}
                  activeOpacity={0.9}
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 transition-all duration-200 active:scale-95 dark:border-red-900 dark:bg-gray-900"
                >
                  <Ionicons name="exit-outline" size={16} color="#EF4444" />
                  <Text className="text-sm font-bold text-red-500">Leave Trip</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text className="mb-4 text-sm text-slate-500">You haven't joined this trip yet.</Text>
              <PressableCard
                onPress={handleJoin}
                disabled={joinTrip.isPending}
                className="flex-row items-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 transition-all duration-200 active:scale-95 dark:bg-white"
              >
                <Ionicons name="airplane-outline" size={18} color={isDark ? '#0f172a' : 'white'} />
                <Text className="text-sm font-bold text-white dark:text-slate-900">Join Trip</Text>
              </PressableCard>
            </View>
          )}
        </View>

        {/* Spending by category */}
        {Object.keys(byCategory).length > 0 && (
          <View className="mb-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <Text className="mb-4 text-slate-400 text-xs font-semibold tracking-wider uppercase">Spending by Category</Text>
            {Object.entries(byCategory).map(([cat, amount]) => (
              <View key={cat} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-gray-800">
                  <Ionicons name={CATEGORY_ICONS[cat] as any ?? 'ellipsis-horizontal-outline'} size={15} color="#64748B" />
                </View>
                <Text className="flex-1 capitalize text-slate-700 dark:text-slate-350">{cat}</Text>
                <Text className="font-bold text-slate-900 dark:text-white">${(amount as number).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {isMember && (
        <View className="absolute bottom-6 right-5">
          <TouchableOpacity
            onPress={() => router.push(`/group/${groupId}/trip/${tripId}/add-expense`)}
            activeOpacity={0.9}
            className="flex-row items-center gap-2 rounded-full bg-slate-900 px-6 py-4 shadow-md transition-all duration-200 active:scale-95 dark:bg-white"
          >
            <Ionicons name="add" size={20} color={isDark ? '#0f172a' : 'white'} />
            <Text className="font-bold text-white dark:text-slate-900">Add Expense</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
