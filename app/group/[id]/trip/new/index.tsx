import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { useCreateTrip } from '../../../../../hooks/useTrip';

type CalendarTarget = 'start' | 'end' | null;

function formatDisplay(dateStr: string) {
  if (!dateStr) return '';
  return format(new Date(dateStr + 'T12:00:00'), 'MMM d, yyyy');
}

export default function NewTripScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const createTrip = useCreateTrip();

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
      marks[startDate] = { selected: true, selectedColor: '#2563EB' };
    } else if (calendarTarget === 'end') {
      if (startDate) marks[startDate] = { selected: true, selectedColor: '#2563EB', selectedTextColor: 'white' };
      if (endDate) marks[endDate] = { selected: true, selectedColor: '#2563EB' };
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const cur = new Date(start);
        cur.setDate(cur.getDate() + 1);
        while (cur < end) {
          const key = cur.toISOString().split('T')[0];
          marks[key] = { color: '#DBEAFE', textColor: '#1D4ED8' };
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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Plan a Trip' }} />
      <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Plan a Trip</Text>
        <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">Fill in the details. Budget comes later.</Text>

        {[
          { label: 'Trip Name *', value: title, set: setTitle, placeholder: 'e.g. Beach Weekend, Mountain Hike' },
          { label: 'Destination *', value: destination, set: setDestination, placeholder: 'e.g. Bali, Indonesia' },
        ].map(({ label, value, set, placeholder }) => (
          <View key={label} className="mb-4">
            <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</Text>
            <TextInput
              value={value}
              onChangeText={set}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </View>
        ))}

        <View className="mb-4 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Start Date *</Text>
            <TouchableOpacity
              onPress={() => openCalendar('start')}
              className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
              <Text className={startDate ? 'text-base text-gray-900 dark:text-white' : 'text-base text-gray-400'}>
                {startDate ? formatDisplay(startDate) : 'Pick date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">End Date *</Text>
            <TouchableOpacity
              onPress={() => openCalendar('end')}
              className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
              <Text className={endDate ? 'text-base text-gray-900 dark:text-white' : 'text-base text-gray-400'}>
                {endDate ? formatDisplay(endDate) : 'Pick date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What are you planning to do?"
          placeholderTextColor="#94A3B8"
          className="mb-8 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ height: 80 }}
        />
      </ScrollView>

      <View className="px-5 pb-6">
        <TouchableOpacity
          onPress={handleCreate}
          disabled={createTrip.isPending}
          className="items-center rounded-2xl bg-primary py-4"
        >
          {createTrip.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">Create Trip</Text>
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
            <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
              <Text className="text-base font-bold text-gray-900 dark:text-white">
                {calendarTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <TouchableOpacity onPress={() => setCalendarTarget(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={handleDayPress}
              markedDates={getMarkedDates()}
              markingType={calendarTarget === 'end' && startDate && endDate ? 'period' : 'simple'}
              minDate={calendarTarget === 'end' ? startDate : undefined}
              theme={{
                selectedDayBackgroundColor: '#2563EB',
                todayTextColor: '#2563EB',
                arrowColor: '#2563EB',
              }}
            />
            <View className="h-6" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
