import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { useCreateSoloTrip } from '../../../hooks/useTrip';
import { useTheme } from '../../../hooks/useTheme';

type CalendarTarget = 'start' | 'end' | null;

function formatDisplay(dateStr: string) {
  if (!dateStr) return '';
  return format(new Date(dateStr + 'T12:00:00'), 'MMM d, yyyy');
}

export default function NewSoloTripScreen() {
  const router = useRouter();
  const createTrip = useCreateSoloTrip();
  const { isDark } = useTheme();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>(null);

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
    const selectedColor = isDark ? '#2563EB' : '#0f172a';
    const selectedTextColor = 'white';
    if (calendarTarget === 'start' && startDate) {
      marks[startDate] = { selected: true, selectedColor, selectedTextColor };
    } else if (calendarTarget === 'end') {
      if (startDate) marks[startDate] = { selected: true, selectedColor, selectedTextColor };
      if (endDate) marks[endDate] = { selected: true, selectedColor, selectedTextColor };
      if (startDate && endDate) {
        const cur = new Date(startDate);
        cur.setDate(cur.getDate() + 1);
        const end = new Date(endDate);
        while (cur < end) {
          const key = cur.toISOString().split('T')[0];
          marks[key] = isDark
            ? { color: '#DBEAFE', textColor: '#1D4ED8' }
            : { color: '#f1f5f9', textColor: '#475569' };
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
        title: title.trim(),
        destination: destination.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate,
        status: 'planning',
        cover_image: null,
      });
      router.replace(`/trip/${trip.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Plan a Solo Trip' }} />
      <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="text-slate-900 text-2xl font-bold dark:text-white">Solo Trip</Text>
        <Text className="mb-8 text-sm text-slate-500 dark:text-gray-400">Just you. Fill in the details.</Text>

        <View className="mb-6">
          <Text className="mb-2 text-slate-400 dark:text-gray-300 text-xs font-semibold tracking-wider uppercase">Trip Name *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Beach Weekend, Mountain Hike"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </View>

        <View className="mb-6">
          <Text className="mb-2 text-slate-400 dark:text-gray-300 text-xs font-semibold tracking-wider uppercase">Destination *</Text>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. Bali, Indonesia"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </View>

        <View className="mb-6 flex-row gap-4">
          {(['start', 'end'] as const).map((target) => (
            <View key={target} className="flex-1">
              <Text className="mb-2 text-slate-400 dark:text-gray-300 text-xs font-semibold tracking-wider uppercase">
                {target === 'start' ? 'Start Date *' : 'End Date *'}
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarTarget(target)}
                activeOpacity={0.9}
                className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 shadow-sm"
              >
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <Text className={target === 'start' ? (startDate ? 'text-base font-semibold text-slate-900 dark:text-white' : 'text-base text-gray-400') : (endDate ? 'text-base font-semibold text-slate-900 dark:text-white' : 'text-base text-gray-400')}>
                  {target === 'start' ? (startDate ? formatDisplay(startDate) : 'Pick date') : (endDate ? formatDisplay(endDate) : 'Pick date')}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View className="mb-8">
          <Text className="mb-2 text-slate-400 dark:text-gray-300 text-xs font-semibold tracking-wider uppercase">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What are you planning to do?"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            paddingVertical: 16,
            backgroundColor: '#2563eb',
            shadowColor: '#2563eb',
            shadowOpacity: 0.45,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 16,
            elevation: 7,
          }}
        >
          {createTrip.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: 'white', letterSpacing: 0.2 }}>Create Trip</Text>
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
          <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: isDark ? '#111827' : '#ffffff' }}>
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
              markingType={calendarTarget === 'end' && startDate && endDate ? 'period' : undefined}
              minDate={calendarTarget === 'end' ? startDate : undefined}
              theme={{
                selectedDayBackgroundColor: isDark ? '#2563EB' : '#0f172a',
                selectedDayTextColor: 'white',
                todayTextColor: '#2563EB',
                arrowColor: isDark ? '#2563EB' : '#0f172a',
                calendarBackground: isDark ? '#111827' : '#ffffff',
                textSectionTitleColor: isDark ? '#9ca3af' : '#475569',
                dayTextColor: isDark ? '#e5e7eb' : '#1e293b',
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
