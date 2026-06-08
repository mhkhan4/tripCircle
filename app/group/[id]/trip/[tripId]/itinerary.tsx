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
import { useAppStore } from '../../../../../store/useAppStore';
import type { ItineraryEntryType, ItineraryEntry } from '../../../../../types';

const ENTRY_TYPES: { value: ItineraryEntryType; label: string; icon: string; color: string }[] = [
  { value: 'flight', label: 'Flight', icon: 'airplane-outline', color: '#2563EB' },
  { value: 'hotel', label: 'Hotel', icon: 'bed-outline', color: '#7C3AED' },
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
  const addEntry = useAddItineraryEntry();
  const deleteEntry = useDeleteItineraryEntry();

  const [showCreate, setShowCreate] = useState(false);
  const [entryType, setEntryType] = useState<ItineraryEntryType>('flight');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  function resetForm() {
    setEntryType('flight');
    setTitle('');
    setDate('');
    setTime('');
    setConfirmation('');
    setLink('');
    setNotes('');
    setShowCalendar(false);
  }

  function buildTimestamp(dateStr: string, timeStr: string) {
    if (!dateStr) return null;
    const t = timeStr.match(/^(\d{1,2}):(\d{2})$/) ? timeStr : '00:00';
    return new Date(`${dateStr}T${t}:00`).toISOString();
  }

  async function handleAdd() {
    if (!title.trim()) return Alert.alert('Missing title', 'Enter a title for this entry.');
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
      Alert.alert('Error', e.message);
    }
  }

  function handleDelete(entry: ItineraryEntry) {
    Alert.alert('Remove entry', 'Delete this itinerary entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteEntry.mutateAsync({ entry_id: entry.id, trip_id: tripId }); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
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
    const canDelete = entry.created_by === user?.id;

    return (
      <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-start gap-3">
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${meta.color}15`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={meta.icon as any} size={18} color={meta.color} />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-900 dark:text-white">{entry.title}</Text>
            {entry.starts_at && (
              <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(entry.starts_at), 'h:mm a')}
              </Text>
            )}
            {entry.confirmation_number && (
              <View className="mt-2 flex-row items-center gap-1">
                <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
                <Text className="text-xs text-gray-400">Conf: <Text className="font-semibold text-gray-600 dark:text-gray-300">{entry.confirmation_number}</Text></Text>
              </View>
            )}
            {entry.notes && (
              <Text className="mt-1 text-xs text-gray-400">{entry.notes}</Text>
            )}
            {entry.link && (
              <TouchableOpacity onPress={() => Linking.openURL(entry.link!)} className="mt-2 flex-row items-center gap-1">
                <Ionicons name="link-outline" size={13} color="#2563EB" />
                <Text className="text-xs font-semibold text-primary">Open link</Text>
              </TouchableOpacity>
            )}
          </View>
          {canDelete && (
            <TouchableOpacity onPress={() => handleDelete(entry)} className="p-1">
              <Ionicons name="trash-outline" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Itinerary' }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {(entries?.length ?? 0) === 0 && (
            <View className="items-center py-16">
              <Ionicons name="map-outline" size={48} color="#CBD5E1" />
              <Text className="mt-3 text-base font-semibold text-gray-400">No itinerary yet</Text>
              <Text className="mt-1 text-sm text-gray-400">Add flights, hotels, and activities to keep bookings in one place.</Text>
            </View>
          )}

          {grouped.map((group) => (
            <View key={group.date}>
              <View className="mb-2 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <Text className="text-xs font-bold text-gray-400">{group.label}</Text>
                <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </View>
              {group.entries.map((e) => <EntryCard key={e.id} entry={e} />)}
            </View>
          ))}

          {undated.length > 0 && (
            <View>
              <View className="mb-2 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <Text className="text-xs font-bold text-gray-400">No Date</Text>
                <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </View>
              {undated.map((e) => <EntryCard key={e.id} entry={e} />)}
            </View>
          )}
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="flex-row items-center gap-2 rounded-2xl bg-primary px-5 py-3 shadow-lg"
          style={{ shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="font-bold text-white">Add Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Create entry modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 justify-end">
            <View className="rounded-t-3xl bg-white px-5 pb-10 pt-5 dark:bg-gray-900" style={{ maxHeight: '90%' }}>
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">Add to Itinerary</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    {ENTRY_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t.value}
                        onPress={() => setEntryType(t.value)}
                        className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${entryType === t.value ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-700'}`}
                      >
                        <Ionicons name={t.icon as any} size={13} color={entryType === t.value ? 'white' : '#64748B'} />
                        <Text className={`text-sm font-semibold ${entryType === t.value ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. United Airlines UA1234"
                  placeholderTextColor="#94A3B8"
                  className="mb-4 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />

                <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Date (optional)</Text>
                <TouchableOpacity
                  onPress={() => setShowCalendar(!showCalendar)}
                  className="mb-2 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                  <Text className={date ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {date ? format(new Date(date + 'T12:00:00'), 'MMM d, yyyy') : 'Choose date'}
                  </Text>
                  {date && (
                    <TouchableOpacity onPress={() => setDate('')} className="ml-auto">
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showCalendar && (
                  <View className="mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    <Calendar
                      onDayPress={(day: { dateString: string }) => { setDate(day.dateString); setShowCalendar(false); }}
                      markedDates={date ? { [date]: { selected: true, selectedColor: '#2563EB' } } : {}}
                    />
                  </View>
                )}

                {date && (
                  <>
                    <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Time (optional, e.g. 14:30)</Text>
                    <TextInput
                      value={time}
                      onChangeText={setTime}
                      placeholder="HH:MM"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numbers-and-punctuation"
                      className="mb-4 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </>
                )}

                <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Confirmation # (optional)</Text>
                <TextInput
                  value={confirmation}
                  onChangeText={setConfirmation}
                  placeholder="e.g. ABC123"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  className="mb-4 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />

                <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Link (optional)</Text>
                <TextInput
                  value={link}
                  onChangeText={setLink}
                  placeholder="https://..."
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="url"
                  className="mb-4 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />

                <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Notes (optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any notes..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  className="mb-4 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />

                <TouchableOpacity
                  onPress={handleAdd}
                  disabled={addEntry.isPending}
                  className="mt-2 items-center rounded-2xl bg-primary py-4"
                >
                  {addEntry.isPending
                    ? <ActivityIndicator color="white" />
                    : <Text className="font-bold text-white">Add to Itinerary</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
