import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { UserProfile } from '../types';

type Props = {
  user: UserProfile;
  alreadyMember: boolean;
  onAdd: (userId: string) => void;
  isLoading: boolean;
};

export default function UserSearchRow({ user, alreadyMember, onAdd, isLoading }: Props) {
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-row items-center justify-between px-5 py-3">
      <View className="flex-row items-center gap-3 flex-1">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-gray-700">
          <Text className="text-sm font-bold text-gray-600 dark:text-gray-300">{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white">{user.full_name}</Text>
          <Text className="text-xs text-gray-400">
            {user.username ? `@${user.username}` : user.email}
          </Text>
        </View>
      </View>
      {alreadyMember ? (
        <View className="rounded-full bg-green-100 px-3 py-1">
          <Text className="text-xs font-semibold text-green-600">In group</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : (
        <TouchableOpacity
          onPress={() => onAdd(user.id)}
          className="rounded-full bg-primary px-3 py-1"
        >
          <Text className="text-xs font-semibold text-white">Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
