import { View, Text, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  const currentMembership = members?.find((m) => m.user_id === user?.id);
  const isAdmin = currentMembership?.role === 'admin';

  function handleRemove(membershipId: string, memberName: string) {
    Alert.alert(
      'Remove Member',
      `Remove ${memberName} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMember.mutate(membershipId),
        },
      ],
    );
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
    </SafeAreaView>
  );
}
