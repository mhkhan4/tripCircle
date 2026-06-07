import '../global.css';
import { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PENDING_INVITE_KEY } from './join/[code]';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 2 } },
});

function AuthGate() {
  const { session } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    const inJoin = segments[0] === 'join';
    const isLoggedIn = !!session;

    if (!isLoggedIn && !inAuth && !inJoin) {
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuth) {
      AsyncStorage.getItem(PENDING_INVITE_KEY).then((code) => {
        if (code && session) {
          router.replace(`/join/${code}`);
        } else {
          router.replace('/(tabs)');
        }
      });
    }
  }, [session, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <View className={isDark ? 'dark flex-1' : 'flex-1'}>
          <AuthGate />
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="group" />
            <Stack.Screen name="join" options={{ headerShown: true }} />
          </Stack>
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
