import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:8081';
const REDIRECT_URL = `${WEB_URL}/callback`;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <View style={{ flex: 1, backgroundColor: '#030712' }}>
      {/* Background gradient feel */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 350,
          backgroundColor: '#0f172a',
          borderBottomLeftRadius: 48,
          borderBottomRightRadius: 48,
        }}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Logo */}
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 90, height: 90, marginBottom: 16 }}
          resizeMode="contain"
        />

        <Text style={{ fontSize: 36, fontWeight: '800', color: '#ffffff', marginBottom: 6, letterSpacing: -0.5 }}>
          TripCircle
        </Text>
        <Text style={{ fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 48, lineHeight: 22 }}>
          Plan trips, track budgets, and travel together.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <View style={{ width: '100%', gap: 12 }}>

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

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#1e293b' }} />
              <Text style={{ fontSize: 12, color: '#475569' }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#1e293b' }} />
            </View>

            {/* Phone Number */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/phone')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                backgroundColor: '#2563EB',
                borderRadius: 16,
                paddingVertical: 16,
              }}
            >
              <Ionicons name="phone-portrait-outline" size={22} color="#ffffff" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>Login with Phone Number</Text>
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
