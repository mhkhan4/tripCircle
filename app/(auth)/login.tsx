import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

function getRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/callback`;
  }
  return `${process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:8081'}/callback`;
}

const REDIRECT_URL = getRedirectUrl();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const isNative = Platform.OS !== 'web';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
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
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Logo */}
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 300, height: 220, marginBottom: 32 }}
          resizeMode="contain"
        />

        <Text style={{ fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 48, lineHeight: 22 }}>
          Plan trips, track budgets, and travel together.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <View style={{ width: '100%' }}>

            {/* Google */}
            <TouchableOpacity
              onPress={signInWithGoogle}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                backgroundColor: '#ffffff',
                borderRadius: 16,
                paddingVertical: 16,
              }}
            >
              <Ionicons name="logo-google" size={22} color="#EA4335" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b' }}>Continue with Google</Text>
            </TouchableOpacity>

          </View>
        )}
      </View>

      <Text style={{ paddingBottom: 32, textAlign: 'center', fontSize: 12, color: '#334155' }}>
        By continuing, you agree to our Terms &amp; Privacy Policy
      </Text>
    </View>
  );
}
