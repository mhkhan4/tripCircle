import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GroupMemberWithProfile } from '../types';

type Props = {
  member: GroupMemberWithProfile;
  isCurrentUser: boolean;
  currentUserIsAdmin: boolean;
  onRemove?: (membershipId: string) => void;
};

export default function MemberRow({ member, isCurrentUser, currentUserIsAdmin, onRemove }: Props) {
  const initials = member.user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-row items-center justify-between px-5 py-3">
      <View className="flex-row items-center gap-3 flex-1">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Text className="text-sm font-bold text-white">{initials}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              {member.user.full_name}
            </Text>
            {isCurrentUser && (
              <Text className="text-xs text-gray-400">(you)</Text>
            )}
            {member.role === 'admin' && (
              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="text-xs font-semibold text-primary">Admin</Text>
              </View>
            )}
          </View>
          {member.user.username ? (
            <Text className="text-xs text-gray-400">@{member.user.username}</Text>
          ) : (
            <Text className="text-xs text-gray-400">{member.user.email}</Text>
          )}
        </View>
      </View>
      {currentUserIsAdmin && !isCurrentUser && onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(member.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove-circle-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}
