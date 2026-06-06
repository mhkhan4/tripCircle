import '../global.css';
import { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store/useAppStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 2 } },
});

function AuthGate() {
  const { session } = useAuth();
  const { isGuest } = useAppStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    const isLoggedIn = !!session || isGuest;
    if (!isLoggedIn && !inAuth) router.replace('/(auth)/login');
    else if (isLoggedIn && inAuth) router.replace('/(tabs)');
  }, [session, isGuest, segments]);

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
          </Stack>
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
