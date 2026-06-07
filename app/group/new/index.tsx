import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateGroup } from '../../../hooks/useGroup';

export default function NewGroupScreen() {
  const router = useRouter();
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function handleCreate() {
    if (!name.trim()) return Alert.alert('Name required', 'Give your group a name.');

    try {
      const group = await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
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
