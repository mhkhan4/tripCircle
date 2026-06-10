import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
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
import { useTheme } from '../../../../../hooks/useTheme';
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
  const { isDark } = useTheme();

  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState<PollType>('custom');
  const [options, setOptions] = useState(['', '']);
  const [closesDate, setClosesDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [errors, setErrors] = useState<{ question?: string; options?: string; closesDate?: string; submit?: string }>({});
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

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
      setAlertInfo({ title: 'Error', message: e.message });
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
      setAlertInfo({ title: 'Error', message: e.message });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-slate-950/60" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Polls' }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? '#ffffff' : '#0f172a'} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          {polls?.length === 0 && (
            <View className="items-center py-20">
              <Ionicons name="stats-chart-outline" size={48} color="#94A3B8" />
              <Text className="mt-4 text-base font-bold text-slate-900 dark:text-white">No Polls Yet</Text>
              <Text className="mt-2 text-sm text-slate-500 text-center max-w-xs leading-relaxed">Create a poll to settle group decisions fast.</Text>
            </View>
          )}

          <View className="gap-6">
            {polls?.map((poll) => {
              const closed = isPast(new Date(poll.closes_at));
              const totalVotes = poll.votes.length;
              const winner = closed ? winningOptionId(poll) : null;

              return (
                <View key={poll.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
                  <View className="mb-4 flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="mb-2 flex-row items-center gap-2">
                        <View className={`rounded-full px-2.5 py-0.5 ${closed ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30'}`}>
                          <Text className={`text-[10px] font-extrabold uppercase tracking-wider ${closed ? 'text-slate-550' : 'text-blue-600 dark:text-blue-400'}`}>
                            {closed ? 'Closed' : countdown(poll.closes_at)}
                          </Text>
                        </View>
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{poll.poll_type}</Text>
                      </View>
                      <Text className="text-lg font-bold text-slate-900 dark:text-white mt-1 leading-snug">{poll.question}</Text>
                    </View>
                    {(poll.created_by === user?.id || isTripAdmin) && (
                      <TouchableOpacity onPress={() => handleDelete(poll)} className="ml-3 p-1 transition-all duration-200 active:scale-95">
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View className="gap-3">
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
                            className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-all duration-200 active:scale-98 dark:border-slate-800/80 dark:bg-slate-900/50"
                          >
                            <Text className="font-semibold text-slate-850 dark:text-slate-200">{opt.label}</Text>
                          </TouchableOpacity>
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => !closed && handleVote(poll, opt.id)}
                          disabled={closed || vote.isPending}
                          className={`overflow-hidden rounded-xl border transition-all duration-200 active:scale-98 ${isWinner ? 'border-emerald-500 dark:border-emerald-500/80' : isMyVote ? 'border-slate-900 dark:border-white' : 'border-slate-100 dark:border-slate-800/80'}`}
                        >
                          <View className="relative px-4 py-3.5">
                            <View
                              className={`absolute inset-y-0 left-0 ${isWinner ? 'bg-emerald-50/80 dark:bg-emerald-950/20' : isMyVote ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}
                              style={{ width: `${pct}%` }}
                            />
                            <View className="relative flex-row items-center justify-between">
                              <View className="flex-row items-center gap-2">
                                {isWinner && <Ionicons name="trophy" size={14} color="#10B981" />}
                                {isMyVote && !isWinner && <Ionicons name="checkmark-circle" size={14} color={isDark ? '#ffffff' : '#0f172a'} />}
                                <Text className={`font-semibold ${isWinner ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>{opt.label}</Text>
                              </View>
                              <Text className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{pct}%</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                    {!closed && ` · closes ${format(new Date(poll.closes_at), 'MMM d')}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="flex-row items-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 shadow-lg transition-all duration-200 active:scale-95 dark:bg-white"
        >
          <Ionicons name="add" size={20} color={isDark ? '#0f172a' : '#ffffff'} />
          <Text className="font-bold text-white dark:text-slate-900 uppercase tracking-wider text-xs">New Poll</Text>
        </TouchableOpacity>
      </View>

      {/* Delete confirmation modal */}
      <Modal visible={!!confirmDeleteId} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
            <Text className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Delete Poll?</Text>
            <Text className="mb-6 text-sm text-slate-500 dark:text-slate-400">This will remove the poll and all votes. This cannot be undone.</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmDeleteId(null)}
                className="flex-1 items-center rounded-xl border border-slate-100 bg-white py-3 transition-all duration-200 active:scale-95 dark:border-slate-800/80 dark:bg-slate-900"
              >
                <Text className="font-semibold text-slate-500 dark:text-slate-400">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deletePoll.isPending}
                className="flex-1 items-center rounded-xl bg-red-500 py-3 transition-all duration-200 active:scale-95"
              >
                {deletePoll.isPending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="font-bold text-white">Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create poll modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 justify-end bg-black/50">
            <View className="rounded-t-3xl bg-white px-6 pb-12 pt-6 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80" style={{ maxHeight: '90%' }}>
              <View className="mb-6 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-900 dark:text-white">New Poll</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Question</Text>
                <TextInput
                  value={question}
                  onChangeText={(v) => { setQuestion(v); if (errors.question) setErrors((e) => ({ ...e, question: undefined })); }}
                  placeholder="Where should we go?"
                  placeholderTextColor="#94A3B8"
                  className={`rounded-xl border bg-white px-4 py-4 text-base text-slate-900 dark:bg-slate-900 dark:text-white ${errors.question ? 'mb-1 border-red-500' : 'mb-4 border-slate-100 dark:border-slate-800/80'}`}
                />
                {!!errors.question && <Text className="mb-3 text-xs font-medium text-red-500">{errors.question}</Text>}

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Type</Text>
                <View className="mb-5 flex-row flex-wrap gap-2">
                  {POLL_TYPES.map((t) => {
                    const isSelected = pollType === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        onPress={() => setPollType(t.value)}
                        className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 transition-all duration-200 active:scale-95 ${isSelected ? 'bg-slate-900 dark:bg-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                      >
                        <Ionicons name={t.icon as any} size={14} color={isSelected ? (isDark ? '#0f172a' : 'white') : '#64748B'} />
                        <Text className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Options (2–4)</Text>
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
                    className={`mb-3 rounded-xl border bg-white px-4 py-4 text-base text-slate-900 dark:bg-slate-900 dark:text-white ${errors.options && !opt.trim() ? 'border-red-500' : 'border-slate-100 dark:border-slate-800/80'}`}
                  />
                ))}
                {!!errors.options && <Text className="mb-2 text-xs font-medium text-red-500">{errors.options}</Text>}
                {options.filter(Boolean).length < 4 && (
                  <TouchableOpacity onPress={() => setOptions([...options, ''])} className="mb-5 flex-row items-center gap-1.5 transition-all duration-200 active:scale-95">
                    <Ionicons name="add-circle" size={20} color="#2563EB" />
                    <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">Add Option</Text>
                  </TouchableOpacity>
                )}

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Deadline</Text>
                <TouchableOpacity
                  onPress={() => { setShowCalendar(!showCalendar); if (errors.closesDate) setErrors((e) => ({ ...e, closesDate: undefined })); }}
                  className={`mb-3 flex-row items-center gap-2 rounded-xl border bg-white px-4 py-4 dark:bg-slate-900 ${errors.closesDate ? 'border-red-500' : 'border-slate-100 dark:border-slate-800/80'}`}
                >
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                  <Text className={closesDate ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400'}>
                    {closesDate ? format(new Date(closesDate + 'T12:00:00'), 'MMM d, yyyy') : 'Choose closing date'}
                  </Text>
                </TouchableOpacity>

                {!!errors.closesDate && <Text className="mb-2 text-xs font-medium text-red-500">{errors.closesDate}</Text>}

                {showCalendar && (
                  <View className="mb-5 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <Calendar
                      theme={{
                        calendarBackground: isDark ? '#0f172a' : '#ffffff',
                        textSectionTitleColor: isDark ? '#94a3b8' : '#475569',
                        selectedDayBackgroundColor: isDark ? '#ffffff' : '#0f172a',
                        selectedDayTextColor: isDark ? '#0f172a' : '#ffffff',
                        todayTextColor: '#2563eb',
                        dayTextColor: isDark ? '#ffffff' : '#0f172a',
                        textDisabledColor: isDark ? '#334155' : '#cbd5e1',
                        dotColor: '#2563eb',
                        arrowColor: '#2563eb',
                        monthTextColor: isDark ? '#ffffff' : '#0f172a',
                        textDayFontWeight: '500',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '600',
                      }}
                      onDayPress={(day: { dateString: string }) => { setClosesDate(day.dateString); setShowCalendar(false); if (errors.closesDate) setErrors((e) => ({ ...e, closesDate: undefined })); }}
                      markedDates={closesDate ? { [closesDate]: { selected: true, selectedColor: isDark ? '#ffffff' : '#0f172a', selectedTextColor: isDark ? '#0f172a' : '#ffffff' } } : {}}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  </View>
                )}
              </ScrollView>

              {!!errors.submit && <Text className="mb-3 text-center text-xs font-medium text-red-500">{errors.submit}</Text>}
              <TouchableOpacity
                onPress={handleCreate}
                disabled={createPoll.isPending}
                className="mt-2 rounded-xl bg-slate-900 py-4 items-center transition-all duration-200 active:scale-95 dark:bg-white"
              >
                {createPoll.isPending ? (
                  <ActivityIndicator color={isDark ? '#0f172a' : 'white'} />
                ) : (
                  <Text className="font-bold text-white dark:text-slate-900 uppercase tracking-wider text-xs">Create Poll</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal visible={!!alertInfo} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
            <Text className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{alertInfo?.title}</Text>
            <Text className="mb-6 text-sm text-slate-500 dark:text-slate-400">{alertInfo?.message}</Text>
            <TouchableOpacity
              onPress={() => setAlertInfo(null)}
              className="w-full items-center rounded-xl bg-slate-900 py-3 transition-all duration-200 active:scale-95 dark:bg-white"
            >
              <Text className="font-bold text-white dark:text-slate-900">Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
