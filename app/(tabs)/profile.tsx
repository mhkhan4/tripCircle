import { View, Text, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/useAppStore';

export default function ProfileScreen() {
  const { user: authUser, signOut } = useAuth();
  const { user, isGuest } = useAppStore();

  function confirmSignOut() {
    const action = signOut;
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) action();
      return;
    }
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: action },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950">
      <View className="px-5 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Profile</Text>
      </View>

      {isGuest && (
        <View className="mx-5 mb-3 flex-row items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
          <Ionicons name="information-circle-outline" size={18} color="#D97706" />
          <Text className="flex-1 text-sm text-amber-700 dark:text-amber-400">
            You're browsing as a guest. Sign in to save your data.
          </Text>
        </View>
      )}

      <View className="mx-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center gap-4">
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} className="h-16 w-16 rounded-2xl" />
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Text className="text-2xl font-bold text-white">
                {user?.full_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white">{user?.full_name ?? 'Traveler'}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</Text>
            {isGuest && (
              <View className="mt-1 self-start rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/30">
                <Text className="text-xs font-semibold text-amber-600 dark:text-amber-400">Guest</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="mx-5 mt-4 rounded-2xl bg-white shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        {[
          { icon: 'notifications-outline', label: 'Notifications' },
          { icon: 'lock-closed-outline', label: 'Privacy' },
          { icon: 'help-circle-outline', label: 'Help & Support' },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.label}
            className="flex-row items-center gap-3 px-5 py-4"
            style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9' }}
          >
            <Ionicons name={item.icon as any} size={20} color="#64748B" />
            <Text className="flex-1 text-base text-gray-700 dark:text-gray-200">{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={confirmSignOut}
        className="mx-5 mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-red-50 py-4 dark:bg-red-900/20"
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text className="font-semibold text-red-500">{isGuest ? 'Exit Guest Mode' : 'Sign Out'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
