import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:8081';
const REDIRECT_URL = `${WEB_URL}/callback`;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { signInAsGuest } = useAppStore();

  async function signInWithProvider(provider: 'google' | 'facebook') {
    setLoading(true);
    const isNative = Platform.OS !== 'web';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: REDIRECT_URL,
        skipBrowserRedirect: isNative,
      },
    });
    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }
    if (isNative && data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
      if (result.type === 'success' && result.url) {
        const hash = result.url.split('#')[1] ?? '';
        const params = Object.fromEntries(new URLSearchParams(hash));
        if (params.access_token && params.refresh_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
        }
      }
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-2 h-20 w-20 items-center justify-center rounded-3xl bg-primary">
          <Ionicons name="airplane" size={40} color="white" />
        </View>
        <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">TripCircle</Text>
        <Text className="mb-12 text-center text-base text-gray-500 dark:text-gray-400">
          Plan trips, track budgets, and travel together.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={() => signInWithProvider('google')}
              className="flex-row items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <Ionicons name="logo-google" size={22} color="#EA4335" />
              <Text className="text-base font-semibold text-gray-800 dark:text-white">Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => signInWithProvider('facebook')}
              className="flex-row items-center justify-center gap-3 rounded-2xl bg-blue-600 py-4"
            >
              <Ionicons name="logo-facebook" size={22} color="white" />
              <Text className="text-base font-semibold text-white">Continue with Facebook</Text>
            </TouchableOpacity>

            <View className="flex-row items-center gap-3 py-1">
              <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <Text className="text-xs text-gray-400">or</Text>
              <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </View>

            <TouchableOpacity
              onPress={signInAsGuest}
              className="flex-row items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 py-4 dark:border-gray-600"
            >
              <Ionicons name="person-outline" size={22} color="#94A3B8" />
              <Text className="text-base font-semibold text-gray-400">Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text className="pb-8 text-center text-xs text-gray-400 dark:text-gray-600">
        By continuing, you agree to our Terms & Privacy Policy
      </Text>
    </View>
  );
}
