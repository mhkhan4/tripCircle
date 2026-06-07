import { View, Text, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useGroupMembers, useSearchUsers, useAddMember } from '../../../hooks/useGroup';
import { useAppStore } from '../../../store/useAppStore';
import UserSearchRow from '../../../components/UserSearchRow';
import type { UserProfile } from '../../../types';

export default function AddMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isGuest } = useAppStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data: members } = useGroupMembers(id);
  const { data: results, isFetching } = useSearchUsers(debouncedQuery, id);
  const addMember = useAddMember(id);

  const debounceRef = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (value: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => setDebouncedQuery(value), 300);
      };
    })(),
    [],
  );

  function handleChangeText(value: string) {
    setQuery(value);
    debounceRef(value);
  }

  async function handleAdd(userId: string) {
    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to add members to the group.');
      return;
    }
    setAddingId(userId);
    try {
      await addMember.mutateAsync(userId);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add member.');
    } finally {
      setAddingId(null);
    }
  }

  const memberIds = new Set(members?.map((m) => m.user_id) ?? []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Add Member' }} />

      <View className="mx-5 mt-4">
        <View className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
          <Text className="text-gray-400">🔍</Text>
          <TextInput
            className="flex-1 text-sm text-gray-900 dark:text-white"
            placeholder="Search by name, @username, or email"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={handleChangeText}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
          {isFetching && <ActivityIndicator size="small" color="#2563EB" />}
        </View>
      </View>

      <FlatList
        data={results ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: UserProfile }) => (
          <UserSearchRow
            user={item}
            alreadyMember={memberIds.has(item.id)}
            onAdd={handleAdd}
            isLoading={addingId === item.id}
          />
        )}
        ItemSeparatorComponent={() => (
          <View className="mx-5 h-px bg-gray-100 dark:bg-gray-800" />
        )}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-sm text-gray-400">
              {debouncedQuery.length < 2
                ? 'Type a name, @username, or email to search'
                : 'No TripOrbit users found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
