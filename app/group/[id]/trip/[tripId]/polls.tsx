import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format, isPast, differenceInHours, differenceInDays } from 'date-fns';
import { useTripPolls, useCreatePoll, useVote, useDeletePoll } from '../../../../../hooks/usePoll';
import { useTripMembers, useTrip } from '../../../../../hooks/useTrip';
import { useAppStore } from '../../../../../store/useAppStore';
import type { PollType, TripPoll } from '../../../../../types';

const POLL_TYPES: { value: PollType; label: string; icon: string }[] = [
  { value: 'destination', label: 'Destination', icon: 'location-outline' },
  { value: 'date', label: 'Date', icon: 'calendar-outline' },
  { value: 'activity', label: 'Activity', icon: 'bicycle-outline' },
  { value: 'custom', label: 'Custom', icon: 'chatbubble-ellipses-outline' },
];

function countdown(closesAt: string) {
  const hours = differenceInHours(new Date(closesAt), new Date());
  if (hours < 1) return 'Closes soon';
  if (hours < 24) return `${hours}h left`;
  const days = differenceInDays(new Date(closesAt), new Date());
  return `${days}d left`;
}

function voteCountForOption(poll: TripPoll, optionId: string) {
  return poll.votes.filter((v) => v.option_id === optionId).length;
}

function winningOptionId(poll: TripPoll): string | null {
  if (!poll.options.length || !poll.votes.length) return null;
  const counts = new Map<string, number>();
  for (const opt of poll.options) counts.set(opt.id, 0);
  for (const v of poll.votes) counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  if (maxCount === 0) return null;
  const leaders = [...counts.entries()].filter(([, c]) => c === maxCount);
  return leaders.length === 1 ? leaders[0][0] : null; // null on tie — no false winner
}

export default function PollsScreen() {
  const { id: groupId, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const { user } = useAppStore();
  const { data: polls, isLoading } = useTripPolls(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: tripMembers } = useTripMembers(tripId);
  const myMembership = tripMembers?.find((m) => m.user_id === user?.id);
  const isTripAdmin = trip?.created_by === user?.id || myMembership?.role === 'admin';
  const createPoll = useCreatePoll();
  const vote = useVote();
  const deletePoll = useDeletePoll();

  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState<PollType>('custom');
  const [options, setOptions] = useState(['', '']);
  const [closesDate, setClosesDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [errors, setErrors] = useState<{ question?: string; options?: string; closesDate?: string; submit?: string }>({});

  function resetForm() {
    setQuestion('');
    setPollType('custom');
    setOptions(['', '']);
    setClosesDate('');
    setShowCalendar(false);
    setErrors({});
  }

  async function handleCreate() {
    const trimmed = question.trim();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    const newErrors: typeof errors = {};
    if (!trimmed) newErrors.question = 'Poll question is required.';
    if (validOptions.length < 2) newErrors.options = 'Add at least 2 options.';
    if (!closesDate) newErrors.closesDate = 'Choose a closing date.';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    try {
      await createPoll.mutateAsync({
        trip_id: tripId,
        question: trimmed,
        poll_type: pollType,
        closes_at: new Date(closesDate + 'T23:59:59').toISOString(),
        options: validOptions,
      });
      setShowCreate(false);
      resetForm();
    } catch (e: any) {
      setErrors({ submit: e.message });
    }
  }

  async function handleVote(poll: TripPoll, optionId: string) {
    if (isPast(new Date(poll.closes_at))) return;
    try {
      await vote.mutateAsync({ poll_id: poll.id, option_id: optionId, trip_id: tripId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(poll: TripPoll) {
    setConfirmDeleteId(poll.id);
  }

  async function confirmDelete() {
    const poll = polls?.find((p) => p.id === confirmDeleteId);
    if (!poll) return;
    setConfirmDeleteId(null);
    try {
      await deletePoll.mutateAsync({ poll_id: poll.id, trip_id: tripId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Polls' }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {polls?.length === 0 && (
            <View className="items-center py-16">
              <Ionicons name="stats-chart-outline" size={48} color="#CBD5E1" />
              <Text className="mt-3 text-base font-semibold text-gray-400">No polls yet</Text>
              <Text className="mt-1 text-sm text-gray-400">Create a poll to settle group decisions fast.</Text>
            </View>
          )}

          {polls?.map((poll) => {
            const closed = isPast(new Date(poll.closes_at));
            const totalVotes = poll.votes.length;
            const winner = closed ? winningOptionId(poll) : null;

            return (
              <View key={poll.id} className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                <View className="mb-2 flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="mb-1 flex-row items-center gap-2">
                      <View className={`rounded-full px-2 py-0.5 ${closed ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                        <Text className={`text-xs font-semibold ${closed ? 'text-gray-500' : 'text-blue-600 dark:text-blue-400'}`}>
                          {closed ? 'Closed' : countdown(poll.closes_at)}
                        </Text>
                      </View>
                      <Text className="text-xs capitalize text-gray-400">{poll.poll_type}</Text>
                    </View>
                    <Text className="text-base font-bold text-gray-900 dark:text-white">{poll.question}</Text>
                  </View>
                  {(poll.created_by === user?.id || isTripAdmin) && (
                    <TouchableOpacity onPress={() => handleDelete(poll)} className="ml-2 p-1">
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View className="gap-2">
                  {poll.options.map((opt) => {
                    const count = voteCountForOption(poll, opt.id);
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isMyVote = poll.myVote === opt.id;
                    const isWinner = opt.id === winner;
                    const showBars = closed || !!poll.myVote;

                    if (!showBars) {
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => handleVote(poll, opt.id)}
                          disabled={vote.isPending}
                          className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-600"
                        >
                          <Text className="font-medium text-gray-800 dark:text-white">{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => !closed && handleVote(poll, opt.id)}
                        disabled={closed || vote.isPending}
                        className={`overflow-hidden rounded-xl border ${isWinner ? 'border-green-400' : isMyVote ? 'border-primary' : 'border-gray-200 dark:border-gray-600'}`}
                      >
                        <View className="relative px-4 py-3">
                          <View
                            className={`absolute inset-y-0 left-0 ${isWinner ? 'bg-green-50 dark:bg-green-900/20' : isMyVote ? 'bg-primary/10' : 'bg-gray-50 dark:bg-gray-700'}`}
                            style={{ width: `${pct}%` }}
                          />
                          <View className="relative flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                              {isWinner && <Ionicons name="trophy-outline" size={14} color="#16A34A" />}
                              {isMyVote && !isWinner && <Ionicons name="checkmark-circle" size={14} color="#2563EB" />}
                              <Text className={`font-medium ${isWinner ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-white'}`}>{opt.label}</Text>
                            </View>
                            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">{pct}%</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text className="mt-2 text-xs text-gray-400">
                  {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                  {!closed && ` · closes ${format(new Date(poll.closes_at), 'MMM d')}`}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="flex-row items-center gap-2 rounded-2xl bg-primary px-5 py-3 shadow-lg"
          style={{ shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="font-bold text-white">New Poll</Text>
        </TouchableOpacity>
      </View>

      {/* Delete confirmation modal */}
      <Modal visible={!!confirmDeleteId} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white p-6 dark:bg-gray-900">
            <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Delete poll?</Text>
            <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">This will remove the poll and all votes. This cannot be undone.</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 items-center dark:border-gray-700"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deletePoll.isPending}
                className="flex-1 rounded-xl bg-red-500 py-3 items-center"
              >
                {deletePoll.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text className="font-bold text-white">Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create poll modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 justify-end">
            <View className="rounded-t-3xl bg-white px-5 pb-10 pt-5 dark:bg-gray-900" style={{ maxHeight: '90%' }}>
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">New Poll</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Question</Text>
                <TextInput
                  value={question}
                  onChangeText={(v) => { setQuestion(v); if (errors.question) setErrors((e) => ({ ...e, question: undefined })); }}
                  placeholder="Where should we go?"
                  placeholderTextColor="#94A3B8"
                  className={`rounded-xl border bg-slate-50 px-4 py-3 text-gray-900 dark:bg-gray-800 dark:text-white ${errors.question ? 'mb-1 border-red-500' : 'mb-4 border-gray-200 dark:border-gray-700'}`}
                />
                {!!errors.question && <Text className="mb-3 text-xs text-red-500">{errors.question}</Text>}

                <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</Text>
                <View className="mb-4 flex-row flex-wrap gap-2">
                  {POLL_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setPollType(t.value)}
                      className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${pollType === t.value ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-700'}`}
                    >
                      <Ionicons name={t.icon as any} size={13} color={pollType === t.value ? 'white' : '#64748B'} />
                      <Text className={`text-sm font-semibold ${pollType === t.value ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Options (2–4)</Text>
                {options.map((opt, i) => (
                  <TextInput
                    key={i}
                    value={opt}
                    onChangeText={(v) => {
                      const next = [...options]; next[i] = v; setOptions(next);
                      if (errors.options) setErrors((e) => ({ ...e, options: undefined }));
                    }}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor="#94A3B8"
                    className={`mb-2 rounded-xl border bg-slate-50 px-4 py-3 text-gray-900 dark:bg-gray-800 dark:text-white ${errors.options && !opt.trim() ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                  />
                ))}
                {!!errors.options && <Text className="mb-2 text-xs text-red-500">{errors.options}</Text>}
                {options.filter(Boolean).length < 4 && (
                  <TouchableOpacity onPress={() => setOptions([...options, ''])} className="mb-4 flex-row items-center gap-1">
                    <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
                    <Text className="text-sm font-semibold text-primary">Add option</Text>
                  </TouchableOpacity>
                )}

                <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Deadline</Text>
                <TouchableOpacity
                  onPress={() => { setShowCalendar(!showCalendar); if (errors.closesDate) setErrors((e) => ({ ...e, closesDate: undefined })); }}
                  className={`mb-2 flex-row items-center gap-2 rounded-xl border bg-slate-50 px-4 py-3 dark:bg-gray-800 ${errors.closesDate ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                  <Text className={closesDate ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {closesDate ? format(new Date(closesDate + 'T12:00:00'), 'MMM d, yyyy') : 'Choose closing date'}
                  </Text>
                </TouchableOpacity>

                {!!errors.closesDate && <Text className="mb-2 text-xs text-red-500">{errors.closesDate}</Text>}

                {showCalendar && (
                  <View className="mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    <Calendar
                      onDayPress={(day: { dateString: string }) => { setClosesDate(day.dateString); setShowCalendar(false); if (errors.closesDate) setErrors((e) => ({ ...e, closesDate: undefined })); }}
                      markedDates={closesDate ? { [closesDate]: { selected: true, selectedColor: '#2563EB' } } : {}}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  </View>
                )}
              </ScrollView>

              {!!errors.submit && <Text className="mb-2 text-center text-xs text-red-500">{errors.submit}</Text>}
              <TouchableOpacity
                onPress={handleCreate}
                disabled={createPoll.isPending}
                className="mt-3 rounded-2xl bg-primary py-4 items-center"
              >
                {createPoll.isPending
                  ? <ActivityIndicator color="white" />
                  : <Text className="font-bold text-white">Create Poll</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
