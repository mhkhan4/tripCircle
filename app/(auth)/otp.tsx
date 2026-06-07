import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const maskedPhone = phone
    ? phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4)
    : '';

  async function verify() {
    if (otp.length !== OTP_LENGTH) {
      Alert.alert('Invalid code', 'Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone ?? '',
      token: otp,
      type: 'sms',
    });
    if (error) {
      Alert.alert('Incorrect code', error.message);
      setLoading(false);
      return;
    }
    // Auth state change listener in _layout.tsx will redirect to tabs automatically
    setLoading(false);
  }

  async function resend() {
    setResending(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: phone ?? '' });
    setResending(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Code resent', 'A new code has been sent to your phone.');
    }
  }

  // Show OTP digits as individual boxes
  const digits = otp.split('');
  while (digits.length < OTP_LENGTH) digits.push('');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#030712' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 64, paddingBottom: 48 }}>
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 48 }}
        >
          <Ionicons name="arrow-back" size={20} color="#94a3b8" />
          <Text style={{ color: '#94a3b8', fontSize: 15 }}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#1e3a8a',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#60a5fa" />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 8, textAlign: 'center' }}>
            Verify your number
          </Text>
          <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 }}>
            Enter the 6-digit code we sent to{'\n'}
            <Text style={{ color: '#93c5fd', fontWeight: '600' }}>{maskedPhone}</Text>
          </Text>
        </View>

        {/* Hidden real input */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
          autoFocus
        />

        {/* OTP boxes */}
        <TouchableOpacity
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 40 }}
        >
          {digits.map((d, i) => (
            <View
              key={i}
              style={{
                width: 48,
                height: 60,
                borderRadius: 14,
                backgroundColor: '#0f172a',
                borderWidth: d ? 2 : 1,
                borderColor: d ? '#2563EB' : '#1e293b',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#f1f5f9' }}>{d || ''}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {/* Verify button */}
        <TouchableOpacity
          onPress={verify}
          disabled={loading || otp.length !== OTP_LENGTH}
          style={{
            backgroundColor: '#2563EB',
            borderRadius: 16,
            paddingVertical: 17,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading || otp.length !== OTP_LENGTH ? 0.5 : 1,
            marginBottom: 20,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>Verify & Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity onPress={resend} disabled={resending} style={{ alignItems: 'center' }}>
          {resending ? (
            <ActivityIndicator color="#475569" size="small" />
          ) : (
            <Text style={{ fontSize: 14, color: '#475569' }}>
              Didn't receive a code?{' '}
              <Text style={{ color: '#2563EB', fontWeight: '600' }}>Resend</Text>
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
