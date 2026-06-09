import { View, Text, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useGroupMembers, useRemoveMember } from '../../../hooks/useGroup';
import { useAppStore } from '../../../store/useAppStore';
import MemberRow from '../../../components/MemberRow';
import type { GroupMemberWithProfile } from '../../../types';

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAppStore();
  const { data: members, isLoading } = useGroupMembers(id);
  const removeMember = useRemoveMember(id);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRemoveName, setConfirmRemoveName] = useState('');

  const currentMembership = members?.find((m) => m.user_id === user?.id);
  const isAdmin = currentMembership?.role === 'admin';

  function handleRemove(membershipId: string, memberName: string) {
    setConfirmRemoveName(memberName);
    setConfirmRemoveId(membershipId);
  }

  async function confirmRemove() {
    if (!confirmRemoveId) return;
    const id = confirmRemoveId;
    setConfirmRemoveId(null);
    removeMember.mutate(id);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Members',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/group/${id}/add-member`)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="person-add-outline" size={22} color="#2563EB" />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: GroupMemberWithProfile }) => (
          <MemberRow
            member={item}
            isCurrentUser={item.user_id === user?.id}
            currentUserIsAdmin={isAdmin}
            onRemove={(membershipId) => handleRemove(membershipId, item.user.full_name)}
          />
        )}
        ItemSeparatorComponent={() => (
          <View className="mx-5 h-px bg-gray-100 dark:bg-gray-800" />
        )}
        ListHeaderComponent={
          <Text className="mx-5 mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {members?.length ?? 0} {members?.length === 1 ? 'member' : 'members'}
          </Text>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View className="items-center py-12">
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text className="mt-3 text-base font-semibold text-gray-600 dark:text-gray-300">
                No members found
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      <Modal visible={!!confirmRemoveId} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white p-6 dark:bg-gray-900">
            <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Remove member?</Text>
            <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Remove {confirmRemoveName} from the group?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmRemoveId(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 items-center dark:border-gray-700"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmRemove}
                disabled={removeMember.isPending}
                className="flex-1 rounded-xl bg-red-500 py-3 items-center"
              >
                {removeMember.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text className="font-bold text-white">Remove</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
