import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  // Normalise to E.164: strip non-digits, prepend +1 if no country code
  function normalisePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    return `+${digits}`;
  }

  async function sendOtp() {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirst) return Alert.alert('Missing info', 'Please enter your first name.');
    if (!trimmedLast) return Alert.alert('Missing info', 'Please enter your last name.');
    if (!trimmedPhone) return Alert.alert('Missing info', 'Please enter your phone number.');

    setLoading(true);
    const e164 = normalisePhone(trimmedPhone);

    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: {
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: `${trimmedFirst} ${trimmedLast}`,
        },
      },
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push({ pathname: '/(auth)/otp', params: { phone: e164 } });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#030712' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 40 }}
        >
          <Ionicons name="arrow-back" size={20} color="#94a3b8" />
          <Text style={{ color: '#94a3b8', fontSize: 15 }}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={{ fontSize: 30, fontWeight: '800', color: '#ffffff', marginBottom: 8, letterSpacing: -0.5 }}>
          Enter your details
        </Text>
        <Text style={{ fontSize: 15, color: '#64748b', marginBottom: 36, lineHeight: 22 }}>
          We'll send a one-time code to your phone to verify your identity.
        </Text>

        {/* First Name */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          First Name
        </Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="John"
          placeholderTextColor="#334155"
          autoCapitalize="words"
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 16,
            fontSize: 16,
            color: '#f1f5f9',
            borderWidth: 1,
            borderColor: '#1e293b',
            marginBottom: 16,
          }}
        />

        {/* Last Name */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Last Name
        </Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Doe"
          placeholderTextColor="#334155"
          autoCapitalize="words"
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 16,
            fontSize: 16,
            color: '#f1f5f9',
            borderWidth: 1,
            borderColor: '#1e293b',
            marginBottom: 16,
          }}
        />

        {/* Phone */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Phone Number
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor="#334155"
          keyboardType="phone-pad"
          autoComplete="tel"
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 16,
            fontSize: 16,
            color: '#f1f5f9',
            borderWidth: 1,
            borderColor: '#1e293b',
            marginBottom: 32,
          }}
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={sendOtp}
          disabled={loading}
          style={{
            backgroundColor: '#2563EB',
            borderRadius: 16,
            paddingVertical: 17,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>Send Code</Text>
          )}
        </TouchableOpacity>

        <Text style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#334155', lineHeight: 20 }}>
          Standard SMS rates may apply.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
