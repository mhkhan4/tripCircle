import { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, Supabase automatically reads the access_token from the URL hash.
      // Just wait for onAuthStateChange to fire, then redirect.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          subscription.unsubscribe();
          router.replace('/(tabs)');
        }
      });
      // Fallback: if no event fires in 3s, go to tabs anyway (session may already exist)
      const t = setTimeout(() => router.replace('/(tabs)'), 3000);
      return () => { subscription.unsubscribe(); clearTimeout(t); };
    } else {
      // Native: parse tokens from the deep link URL
      import('expo-linking').then(({ default: Linking }) => {
        Linking.getInitialURL().then(async (url) => {
          if (url) {
            const parsed = Linking.parse(url);
            const params = parsed.queryParams as Record<string, string> | undefined;
            if (params?.access_token && params?.refresh_token) {
              await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
              });
            }
          }
          router.replace('/(tabs)');
        });
      });
    }
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}
