import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateTrip } from '../../../../../hooks/useTrip';

export default function NewTripScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const createTrip = useCreateTrip();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function handleCreate() {
    if (!title.trim()) return Alert.alert('Required', 'Trip name is required.');
    if (!destination.trim()) return Alert.alert('Required', 'Destination is required.');
    if (!startDate || !endDate) return Alert.alert('Required', 'Please enter start and end dates.');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return Alert.alert('Invalid date', 'Use format YYYY-MM-DD');
    if (end < start) return Alert.alert('Invalid dates', 'End date must be after start date.');

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
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">End Date *</Text>
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              keyboardType="numbers-and-punctuation"
            />
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
    </SafeAreaView>
  );
}
