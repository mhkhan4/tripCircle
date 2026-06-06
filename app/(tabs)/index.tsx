import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroups, useJoinGroup } from '../../hooks/useGroup';
import { useAppStore } from '../../store/useAppStore';
import type { Group } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const { data: groups, isLoading, refetch } = useGroups();
  const joinGroup = useJoinGroup();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function promptJoin() {
    Alert.prompt('Join a Group', 'Enter invite code', async (code) => {
      if (!code) return;
      try { await joinGroup.mutateAsync(code); }
      catch (e: any) { Alert.alert('Error', e.message); }
    });
  }

  function renderGroup({ item }: { item: Group }) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/group/${item.id}`)}
        className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800"
        style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Text className="text-xl font-bold text-white">{item.name[0].toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 dark:text-white">{item.name}</Text>
            {item.description ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950">
      <View className="flex-row items-center justify-between px-5 py-4">
        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-400">Welcome back,</Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">{user?.full_name?.split(' ')[0] ?? 'Traveler'}</Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={promptJoin} className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <Text className="text-sm font-semibold text-primary">Join</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/group/new')} className="rounded-xl bg-primary px-3 py-2">
            <Ionicons name="add" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading groups...</Text>
        </View>
      ) : !groups?.length ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text className="mt-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">No groups yet</Text>
          <Text className="mt-1 text-center text-sm text-gray-400">Create a group and invite your travel buddies.</Text>
          <TouchableOpacity onPress={() => router.push('/group/new')} className="mt-6 rounded-2xl bg-primary px-6 py-3">
            <Text className="font-semibold text-white">Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Your Groups</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
