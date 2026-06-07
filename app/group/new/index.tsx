import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useCreateGroup } from '../../../hooks/useGroup';

export default function NewGroupScreen() {
  const router = useRouter();
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  async function toggleDiscoverable(value: boolean) {
    if (value && locationGranted === null) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationGranted(granted);
      if (!granted) {
        Alert.alert('Location Required', 'Enable location access so your group can appear in nearby searches.');
        return;
      }
    }
    setIsDiscoverable(value);
  }

  async function handleCreate() {
    if (!name.trim()) return Alert.alert('Name required', 'Give your group a name.');

    let lat: number | undefined;
    let lng: number | undefined;

    if (isDiscoverable) {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch {
        Alert.alert('Location Error', 'Could not get your location. The group will be created without discoverability.');
      }
    }

    try {
      const group = await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        is_discoverable: isDiscoverable && lat !== undefined,
        latitude: lat,
        longitude: lng,
      });
      router.replace(`/group/${group.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'New Group' }} />
      <View className="flex-1 px-5 pt-4">
        <Text className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Create a Group</Text>
        <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">Your travel circle starts here.</Text>

        <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Group Name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Squad Goals, Weekend Warriors"
          placeholderTextColor="#94A3B8"
          className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          maxLength={50}
        />

        <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What kind of trips does this group take?"
          placeholderTextColor="#94A3B8"
          className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ height: 80 }}
          maxLength={200}
        />

        <View className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="search-outline" size={16} color="#2563EB" />
                <Text className="font-semibold text-gray-800 dark:text-white">Make Discoverable</Text>
              </View>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Allow nearby users to find and request to join this group
              </Text>
            </View>
            <Switch
              value={isDiscoverable}
              onValueChange={toggleDiscoverable}
              trackColor={{ false: '#E2E8F0', true: '#2563EB' }}
              thumbColor="white"
            />
          </View>
        </View>
      </View>

      <View className="px-5 pb-6">
        <TouchableOpacity
          onPress={handleCreate}
          disabled={createGroup.isPending}
          className="items-center rounded-2xl bg-primary py-4"
        >
          {createGroup.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">Create Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
