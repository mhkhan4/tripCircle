import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TripMemberWithProfile } from '../types';

type Props = {
  member: TripMemberWithProfile;
  isCurrentUser: boolean;
  currentUserIsCreator: boolean;
  onRemove?: (membershipId: string) => void;
};

export default function TripMemberRow({ member, isCurrentUser, currentUserIsCreator, onRemove }: Props) {
  const initial = member.user.full_name?.[0]?.toUpperCase() ?? '?';

  function confirmRemove() {
    Alert.alert(
      'Remove member',
      `Remove ${member.user.full_name} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove?.(member.id) },
      ],
    );
  }

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
        <Text className="text-base font-bold text-white">{initial}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-gray-900 dark:text-white">
          {member.user.full_name}{isCurrentUser ? ' (you)' : ''}
        </Text>
        {member.user.username ? (
          <Text className="text-xs text-gray-400">@{member.user.username}</Text>
        ) : null}
      </View>
      {currentUserIsCreator && !isCurrentUser && onRemove ? (
        <TouchableOpacity onPress={confirmRemove} hitSlop={8}>
          <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
