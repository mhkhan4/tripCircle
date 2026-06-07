import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGroupJoinRequests, useApproveJoinRequest, useRejectJoinRequest } from '../../../hooks/useDiscover';
import type { GroupJoinRequest } from '../../../types';

export default function JoinRequestsScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { data: requests, isLoading } = useGroupJoinRequests(groupId);
  const approve = useApproveJoinRequest(groupId);
  const reject = useRejectJoinRequest(groupId);

  async function handleApprove(req: GroupJoinRequest) {
    try {
      await approve.mutateAsync(req.id);
      Alert.alert('Approved', `${req.user?.full_name ?? 'Member'} has been added to the group.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleReject(req: GroupJoinRequest) {
    Alert.alert(
      'Decline Request',
      `Decline ${req.user?.full_name ?? 'this member'}'s join request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await reject.mutateAsync(req.id);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }

  function renderRequest({ item }: { item: GroupJoinRequest }) {
    const initials = item.user?.full_name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() ?? '?';
    return (
      <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
            <Text className="text-sm font-bold text-white">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-gray-900 dark:text-white">{item.user?.full_name ?? 'Unknown'}</Text>
            <Text className="text-xs text-gray-400">{item.user?.email}</Text>
            {item.message ? <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400" numberOfLines={2}>{item.message}</Text> : null}
          </View>
        </View>
        <View className="mt-3 flex-row gap-2">
          <TouchableOpacity
            onPress={() => handleApprove(item)}
            disabled={approve.isPending}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-green-500 py-2.5"
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text className="font-semibold text-white">Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleReject(item)}
            disabled={reject.isPending}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl border border-gray-200 py-2.5 dark:border-gray-700"
          >
            <Ionicons name="close" size={16} color="#EF4444" />
            <Text className="font-semibold text-red-500">Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Join Requests' }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : !requests?.length ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="checkmark-circle-outline" size={56} color="#CBD5E1" />
          <Text className="mt-3 text-center text-base font-semibold text-gray-700 dark:text-gray-300">No pending requests</Text>
          <Text className="mt-1 text-center text-sm text-gray-400">All caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
          ListHeaderComponent={
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              {requests.length} pending request{requests.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
