import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TripMemberWithProfile } from '../types';

type Props = {
  member: TripMemberWithProfile;
  isCurrentUser: boolean;
  currentUserIsAdmin: boolean;
  isCreator: boolean;
  onRemove?: (membershipId: string) => void;
  onToggleAdmin?: (membershipId: string, currentRole: 'admin' | 'member') => void;
};

export default function TripMemberRow({
  member,
  isCurrentUser,
  currentUserIsAdmin,
  isCreator,
  onRemove,
  onToggleAdmin,
}: Props) {
  const initial = member.user.full_name?.[0]?.toUpperCase() ?? '?';
  const isAdmin = member.role === 'admin';

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

  function confirmToggleAdmin() {
    const action = isAdmin ? 'Remove admin' : 'Make admin';
    const msg = isAdmin
      ? `Remove admin rights from ${member.user.full_name}?`
      : `Make ${member.user.full_name} an admin? They'll be able to delete any poll, task, or itinerary entry.`;
    Alert.alert(action, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, onPress: () => onToggleAdmin?.(member.id, member.role) },
    ]);
  }

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
        <Text className="text-base font-bold text-white">{initial}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold text-gray-900 dark:text-white">
            {member.user.full_name}{isCurrentUser ? ' (you)' : ''}
          </Text>
          {isAdmin && (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-xs font-semibold text-primary">Admin</Text>
            </View>
          )}
        </View>
        {member.user.username ? (
          <Text className="text-xs text-gray-400">@{member.user.username}</Text>
        ) : null}
      </View>
      {currentUserIsAdmin && !isCurrentUser && !isCreator && (
        <View className="flex-row items-center gap-2">
          {onToggleAdmin && (
            <TouchableOpacity onPress={confirmToggleAdmin} hitSlop={8}>
              <Ionicons
                name={isAdmin ? 'shield-checkmark-outline' : 'shield-outline'}
                size={20}
                color={isAdmin ? '#2563EB' : '#94A3B8'}
              />
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity onPress={confirmRemove} hitSlop={8}>
              <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
