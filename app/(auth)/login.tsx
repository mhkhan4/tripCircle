import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0c0b14' }}>
      {/* Full-Page Background Cover Image */}
      <Image
        source={require('../../assets/login_background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      {/* Subtle dark tint overlay to improve legibility */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12, 11, 20, 0.25)' }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section: Slogan */}
        <View style={{ width: '100%', alignItems: 'center', marginTop: 12 }}>
          <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.75)', textAlign: 'center', fontWeight: '600', letterSpacing: 0.5, maxWidth: 280 }}>
            Plan trips, track budgets, and travel together.
          </Text>
        </View>

        {/* Center Section: Brand Wordmark (with the orbital O!) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 32 }}>
          <Text style={{ fontSize: 38, fontWeight: '900', color: 'white', letterSpacing: 0.5 }}>Trip</Text>
          <View style={{ position: 'relative', width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 }}>
            <View style={{ position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: '#fbbf24', opacity: 0.5, transform: [{ rotate: '45deg' }, { scaleX: 0.4 }] }} />
            <Ionicons name="compass" size={26} color="#fbbf24" style={{ transform: [{ rotate: '15deg' }] }} />
          </View>
          <Text style={{ fontSize: 38, fontWeight: '900', color: '#fbbf24', letterSpacing: 0.5, marginLeft: -2 }}>rbit</Text>
        </View>

        {/* Bottom Section: Translucent Glassmorphic Card & Footer */}
        <View style={{ width: '100%', alignItems: 'center' }}>
          
          {/* Glassmorphic Card */}
          <View
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 15,
              elevation: 4,
              marginBottom: 28,
              maxWidth: 340,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: 'white', textAlign: 'center', marginBottom: 16 }}>
              Google Login
            </Text>

            {loading ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator size="small" color="#fbbf24" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={signInWithGoogle}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  backgroundColor: 'white',
                  borderRadius: 14,
                  paddingVertical: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#334155' }}>
                  Continue with Google
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 }}>
            <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Terms</Text>
            <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />
            <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Privacy</Text>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
