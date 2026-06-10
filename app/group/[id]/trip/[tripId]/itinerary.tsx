import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { useTripItinerary, useAddItineraryEntry, useDeleteItineraryEntry } from '../../../../../hooks/useItinerary';
import { useTrip, useTripMembers } from '../../../../../hooks/useTrip';
import { useAppStore } from '../../../../../store/useAppStore';
import { useTheme } from '../../../../../hooks/useTheme';
import type { ItineraryEntryType, ItineraryEntry } from '../../../../../types';

const ENTRY_TYPES: { value: ItineraryEntryType; label: string; icon: string; color: string }[] = [
  { value: 'flight', label: 'Flight', icon: 'airplane-outline', color: '#3B82F6' },
  { value: 'hotel', label: 'Hotel', icon: 'bed-outline', color: '#8B5CF6' },
  { value: 'activity', label: 'Activity', icon: 'bicycle-outline', color: '#10B981' },
  { value: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline', color: '#F59E0B' },
  { value: 'transport', label: 'Transport', icon: 'car-outline', color: '#EF4444' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#64748B' },
];

function typeMeta(type: ItineraryEntryType) {
  return ENTRY_TYPES.find((t) => t.value === type) ?? ENTRY_TYPES[5];
}

export default function ItineraryScreen() {
  const { id: groupId, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const { user } = useAppStore();
  const { data: entries, isLoading } = useTripItinerary(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: tripMembers } = useTripMembers(tripId);
  const myMembership = tripMembers?.find((m) => m.user_id === user?.id);
  const isTripAdmin = trip?.created_by === user?.id || myMembership?.role === 'admin';
  const addEntry = useAddItineraryEntry();
  const deleteEntry = useDeleteItineraryEntry();
  const { isDark } = useTheme();

  const [showCreate, setShowCreate] = useState(false);
  const [entryType, setEntryType] = useState<ItineraryEntryType>('flight');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; submit?: string }>({});

  function resetForm() {
    setEntryType('flight');
    setTitle('');
    setDate('');
    setTime('');
    setConfirmation('');
    setLink('');
    setNotes('');
    setShowCalendar(false);
    setErrors({});
  }

  function buildTimestamp(dateStr: string, timeStr: string) {
    if (!dateStr) return null;
    const match = timeStr.match(/^(\d{1,2}):(\d{1,2})$/);
    const t = match ? `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}` : '00:00';
    return new Date(`${dateStr}T${t}:00`).toISOString();
  }

  async function handleAdd() {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    try {
      await addEntry.mutateAsync({
        trip_id: tripId,
        entry_type: entryType,
        title: title.trim(),
        starts_at: buildTimestamp(date, time),
        confirmation_number: confirmation.trim() || null,
        link: link.trim() || null,
        notes: notes.trim() || null,
      });
      setShowCreate(false);
      resetForm();
    } catch (e: any) {
      setErrors({ submit: e.message });
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(entry: ItineraryEntry) {
    setConfirmDeleteId(entry.id);
  }

  async function confirmDelete() {
    const entry = entries?.find((e) => e.id === confirmDeleteId);
    if (!entry) return;
    setConfirmDeleteId(null);
    try {
      await deleteEntry.mutateAsync({ entry_id: entry.id, trip_id: tripId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  // Group entries by date
  const grouped: { date: string; label: string; entries: ItineraryEntry[] }[] = [];
  const undated: ItineraryEntry[] = [];
  for (const entry of entries ?? []) {
    if (!entry.starts_at) { undated.push(entry); continue; }
    const dateKey = entry.starts_at.split('T')[0];
    const existing = grouped.find((g) => g.date === dateKey);
    if (existing) { existing.entries.push(entry); }
    else { grouped.push({ date: dateKey, label: format(new Date(entry.starts_at), 'EEE, MMM d'), entries: [entry] }); }
  }

  function EntryCard({ entry }: { entry: ItineraryEntry }) {
    const meta = typeMeta(entry.entry_type);
    const canDelete = entry.created_by === user?.id || isTripAdmin;

    return (
      <View className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
        <View className="flex-row items-start gap-4">
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${meta.color}12`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={meta.icon as any} size={18} color={meta.color} />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-slate-900 dark:text-slate-100 text-base">{entry.title}</Text>
            {entry.starts_at && (
              <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase mt-1">
                {format(new Date(entry.starts_at), 'h:mm a')}
              </Text>
            )}
            {entry.confirmation_number && (
              <View className="mt-2.5 flex-row items-center gap-1.5">
                <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
                <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Conf: <Text className="font-bold text-slate-700 dark:text-slate-350">{entry.confirmation_number}</Text></Text>
              </View>
            )}
            {entry.notes && (
              <Text className="mt-2 text-slate-500 text-sm leading-relaxed">{entry.notes}</Text>
            )}
            {entry.link && (
              <TouchableOpacity
                onPress={() => Linking.openURL(entry.link!)}
                activeOpacity={0.9}
                className="mt-3 flex-row items-center gap-1 transition-all duration-200 active:scale-95"
              >
                <Ionicons name="link-outline" size={14} color="#2563EB" />
                <Text className="text-xs font-bold text-primary">Open Link</Text>
              </TouchableOpacity>
            )}
          </View>
          {canDelete && (
            <TouchableOpacity onPress={() => handleDelete(entry)} className="p-1 transition-all duration-200 active:scale-95">
              <Ionicons name="trash-outline" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-slate-950/60" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Itinerary' }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? '#ffffff' : '#0f172a'} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {(entries?.length ?? 0) === 0 && (
            <View className="items-center py-16">
              <Ionicons name="map-outline" size={48} color="#CBD5E1" />
              <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">No itinerary yet</Text>
              <Text className="mt-1 text-sm text-slate-500 text-center">Add flights, hotels, and activities to keep bookings in one place.</Text>
            </View>
          )}

          {grouped.map((group) => (
            <View key={group.date}>
              <View className="mt-6 mb-4 flex-row items-center gap-2">
                <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: isDark ? '#ffffff' : '#0f172a' }} />
                <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">{group.label}</Text>
              </View>
              {group.entries.map((e) => <EntryCard key={e.id} entry={e} />)}
            </View>
          ))}

          {undated.length > 0 && (
            <View>
              <View className="mt-6 mb-4 flex-row items-center gap-2">
                <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: isDark ? '#ffffff' : '#0f172a' }} />
                <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">No Date</Text>
              </View>
              {undated.map((e) => <EntryCard key={e.id} entry={e} />)}
            </View>
          )}
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          activeOpacity={0.9}
          className="flex-row items-center gap-2 rounded-full bg-slate-900 px-6 py-4 shadow-md transition-all duration-200 active:scale-95 dark:bg-white"
        >
          <Ionicons name="add" size={20} color={isDark ? '#0f172a' : 'white'} />
          <Text className="font-bold text-white dark:text-slate-900">Add Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Delete confirmation modal */}
      <Modal visible={!!confirmDeleteId} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white p-6 dark:bg-gray-900">
            <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Delete entry?</Text>
            <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">This itinerary entry will be permanently removed.</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmDeleteId(null)}
                activeOpacity={0.9}
                className="flex-1 rounded-xl border border-gray-200 py-3 items-center dark:border-gray-700 bg-white dark:bg-slate-900 transition-all duration-200 active:scale-95"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deleteEntry.isPending}
                activeOpacity={0.9}
                className="flex-1 rounded-xl bg-red-500 py-3 items-center transition-all duration-200 active:scale-95"
              >
                {deleteEntry.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text className="font-bold text-white">Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create entry modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-white px-5 pb-10 pt-6 dark:bg-slate-900" style={{ maxHeight: '90%' }}>
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Add to Itinerary</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }} className="transition-all duration-200 active:scale-95">
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                  <View className="flex-row gap-2">
                    {ENTRY_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t.value}
                        onPress={() => setEntryType(t.value)}
                        className="flex-row items-center gap-1.5 rounded-full border px-4 py-2.5 transition-all duration-150 active:scale-95"
                        style={{
                          backgroundColor: entryType === t.value ? (isDark ? 'white' : '#0f172a') : 'transparent',
                          borderColor: entryType === t.value ? (isDark ? 'white' : '#0f172a') : (isDark ? '#334155' : '#e2e8f0'),
                        }}
                      >
                        <Ionicons name={t.icon as any} size={14} color={entryType === t.value ? (isDark ? '#0f172a' : 'white') : '#64748B'} />
                        <Text
                          className="text-sm font-semibold capitalize"
                          style={{
                            color: entryType === t.value ? (isDark ? '#0f172a' : 'white') : (isDark ? '#cbd5e1' : '#334155'),
                          }}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Title *</Text>
                <TextInput
                  value={title}
                  onChangeText={(v) => { setTitle(v); if (errors.title) setErrors((e) => ({ ...e, title: undefined })); }}
                  placeholder="e.g. United Airlines UA1234"
                  placeholderTextColor="#94A3B8"
                  className={`rounded-xl border bg-white px-4 py-4 text-base text-slate-900 dark:bg-slate-900 dark:text-white ${errors.title ? 'mb-1 border-red-500' : 'mb-6 border-slate-200 dark:border-slate-800'}`}
                />
                {!!errors.title && <Text className="mb-3 text-xs text-red-500 font-semibold">{errors.title}</Text>}

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Date (optional)</Text>
                <TouchableOpacity
                  onPress={() => setShowCalendar(!showCalendar)}
                  activeOpacity={0.9}
                  className="mb-6 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 transition-all duration-200 active:scale-95 shadow-sm"
                >
                  <Ionicons name="calendar-outline" size={18} color="#64748b" />
                  <Text className={date ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-450'}>
                    {date ? format(new Date(date + 'T12:00:00'), 'MMM d, yyyy') : 'Choose date'}
                  </Text>
                  {!!date && (
                    <TouchableOpacity onPress={() => setDate('')} className="ml-auto p-1">
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showCalendar && (
                  <View className="mb-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <Calendar
                      onDayPress={(day: { dateString: string }) => { setDate(day.dateString); setShowCalendar(false); }}
                      markedDates={date ? { [date]: { selected: true, selectedColor: isDark ? '#ffffff' : '#0f172a', selectedTextColor: isDark ? '#0f172a' : '#ffffff' } } : {}}
                      theme={{
                        calendarBackground: isDark ? '#0f172a' : '#ffffff',
                        selectedDayBackgroundColor: isDark ? '#ffffff' : '#0f172a',
                        selectedDayTextColor: isDark ? '#0f172a' : '#ffffff',
                        arrowColor: isDark ? '#ffffff' : '#0f172a',
                        todayTextColor: '#2563EB',
                        dayTextColor: isDark ? '#cbd5e1' : '#1e293b',
                      }}
                    />
                  </View>
                )}

                {!!date && (
                  <>
                    <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Time (optional, e.g. 14:30)</Text>
                    <TextInput
                      value={time}
                      onChangeText={setTime}
                      placeholder="HH:MM"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numbers-and-punctuation"
                      className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </>
                )}

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Confirmation # (optional)</Text>
                <TextInput
                  value={confirmation}
                  onChangeText={setConfirmation}
                  placeholder="e.g. ABC123"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Link (optional)</Text>
                <TextInput
                  value={link}
                  onChangeText={setLink}
                  placeholder="https://..."
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="url"
                  className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Notes (optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any notes..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />

              </ScrollView>

              {!!errors.submit && <Text className="mb-4 text-center text-xs text-red-500 font-semibold">{errors.submit}</Text>}
              <TouchableOpacity
                onPress={handleAdd}
                disabled={addEntry.isPending}
                activeOpacity={0.9}
                className="items-center justify-center rounded-xl bg-slate-900 py-4 shadow-sm transition-all duration-200 active:scale-95 dark:bg-white"
              >
                {addEntry.isPending
                  ? <ActivityIndicator color={isDark ? '#0f172a' : 'white'} />
                  : <Text className="font-bold text-white dark:text-slate-900">Add to Itinerary</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
