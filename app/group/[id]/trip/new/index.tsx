import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { useCreateTrip } from '../../../../../hooks/useTrip';
import { useTheme } from '../../../../../hooks/useTheme';

type CalendarTarget = 'start' | 'end' | null;

function formatDisplay(dateStr: string) {
  if (!dateStr) return '';
  return format(new Date(dateStr + 'T12:00:00'), 'MMM d, yyyy');
}

export default function NewTripScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const createTrip = useCreateTrip();
  const { isDark } = useTheme();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>(null);

  function openCalendar(target: CalendarTarget) {
    setCalendarTarget(target);
  }

  function handleDayPress(day: { dateString: string }) {
    if (calendarTarget === 'start') {
      setStartDate(day.dateString);
      if (endDate && day.dateString > endDate) setEndDate('');
      setCalendarTarget(null);
    } else if (calendarTarget === 'end') {
      if (startDate && day.dateString < startDate) {
        Alert.alert('Invalid date', 'End date must be after start date.');
        return;
      }
      setEndDate(day.dateString);
      setCalendarTarget(null);
    }
  }

  function getMarkedDates() {
    const marks: Record<string, any> = {};
    if (calendarTarget === 'start' && startDate) {
      marks[startDate] = { selected: true, selectedColor: isDark ? '#ffffff' : '#0f172a', selectedTextColor: isDark ? '#0f172a' : '#ffffff' };
    } else if (calendarTarget === 'end') {
      if (startDate) marks[startDate] = { selected: true, selectedColor: isDark ? '#ffffff' : '#0f172a', selectedTextColor: isDark ? '#0f172a' : '#ffffff' };
      if (endDate) marks[endDate] = { selected: true, selectedColor: isDark ? '#ffffff' : '#0f172a', selectedTextColor: isDark ? '#0f172a' : '#ffffff' };
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const cur = new Date(start);
        cur.setDate(cur.getDate() + 1);
        while (cur < end) {
          const key = cur.toISOString().split('T')[0];
          marks[key] = { color: isDark ? '#1F2937' : '#f1f5f9', textColor: isDark ? '#cbd5e1' : '#475569' };
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    return marks;
  }

  async function handleCreate() {
    if (!title.trim()) return Alert.alert('Required', 'Trip name is required.');
    if (!destination.trim()) return Alert.alert('Required', 'Destination is required.');
    if (!startDate || !endDate) return Alert.alert('Required', 'Please choose start and end dates.');

    try {
      const trip = await createTrip.mutateAsync({
        group_id: groupId,
        user_id: null, // Resolves TS2345 type error: user_id is required but nullable
        title: title.trim(),
        destination: destination.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate,
        status: 'planning',
        cover_image: null,
      });
      router.replace(`/group/${groupId}/trip/${trip.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Plan a Trip' }} />
      <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="text-slate-900 text-2xl font-bold dark:text-white">Plan a Trip</Text>
        <Text className="mb-8 text-sm text-slate-500">Fill in the details. Budget comes later.</Text>

        <View className="mb-6">
          <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Trip Name *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Beach Weekend, Mountain Hike"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </View>

        <View className="mb-6">
          <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Destination *</Text>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. Bali, Indonesia"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </View>

        <View className="mb-6 flex-row gap-4">
          <View className="flex-1">
            <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Start Date *</Text>
            <TouchableOpacity
              onPress={() => openCalendar('start')}
              activeOpacity={0.9}
              className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900 transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Ionicons name="calendar-outline" size={16} color="#64748b" />
              <Text className={startDate ? 'text-base font-semibold text-slate-900 dark:text-white' : 'text-base text-slate-400'}>
                {startDate ? formatDisplay(startDate) : 'Pick date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">End Date *</Text>
            <TouchableOpacity
              onPress={() => openCalendar('end')}
              activeOpacity={0.9}
              className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900 transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Ionicons name="calendar-outline" size={16} color="#64748b" />
              <Text className={endDate ? 'text-base font-semibold text-slate-900 dark:text-white' : 'text-base text-slate-400'}>
                {endDate ? formatDisplay(endDate) : 'Pick date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-8">
          <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What are you planning to do?"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ height: 90 }}
          />
        </View>
      </ScrollView>

      <View className="px-5 pb-6">
        <TouchableOpacity
          onPress={handleCreate}
          disabled={createTrip.isPending}
          activeOpacity={0.9}
          className="items-center justify-center rounded-xl bg-slate-900 py-4 shadow-sm transition-all duration-200 active:scale-95 dark:bg-white"
        >
          {createTrip.isPending ? (
            <ActivityIndicator color={isDark ? '#0f172a' : 'white'} />
          ) : (
            <Text className="text-base font-bold text-white dark:text-slate-900">Create Trip</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={calendarTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarTarget(null)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white dark:bg-gray-900">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <Text className="text-base font-bold text-slate-900 dark:text-white">
                {calendarTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <TouchableOpacity onPress={() => setCalendarTarget(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={handleDayPress}
              markedDates={getMarkedDates()}
              markingType={calendarTarget === 'end' && startDate && endDate ? 'period' : undefined} // Resolves TS2322: replaced 'simple' with undefined
              minDate={calendarTarget === 'end' ? startDate : undefined}
              theme={{
                selectedDayBackgroundColor: isDark ? '#ffffff' : '#0f172a',
                selectedDayTextColor: isDark ? '#0f172a' : '#ffffff',
                todayTextColor: '#2563EB',
                arrowColor: isDark ? '#ffffff' : '#0f172a',
                calendarBackground: isDark ? '#0f172a' : '#ffffff',
                textSectionTitleColor: isDark ? '#94a3b8' : '#475569',
                dayTextColor: isDark ? '#cbd5e1' : '#1e293b',
                monthTextColor: isDark ? '#ffffff' : '#0f172a',
              }}
            />
            <View className="h-6" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
