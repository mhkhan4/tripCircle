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
  Modal,
  FlatList,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type Country = { name: string; dialCode: string; flag: string };

const COUNTRIES: Country[] = [
  { name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { name: 'Ukraine', dialCode: '+380', flag: '🇺🇦' },
  { name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
];

// Returns (XXX) XXX-XXXX for +1 countries, raw digits otherwise
function formatDisplay(digits: string, dialCode: string): string {
  if (dialCode === '+1') {
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return digits;
}

export default function PhoneScreen() {
  const router = useRouter();
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [digits, setDigits] = useState('');
  const [search, setSearch] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  function handlePhoneChange(text: string) {
    // Strip everything except digits
    const raw = text.replace(/\D/g, '');
    const limit = country.dialCode === '+1' ? 10 : 15;
    setDigits(raw.slice(0, limit));
  }

  function buildE164(): string {
    return `${country.dialCode}${digits}`;
  }

  const filteredCountries = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search)
      )
    : COUNTRIES;

  async function sendOtp() {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) return Alert.alert('Missing info', 'Please enter your first name.');
    if (!trimmedLast) return Alert.alert('Missing info', 'Please enter your last name.');
    if (!digits) return Alert.alert('Missing info', 'Please enter your phone number.');

    const minLen = country.dialCode === '+1' ? 10 : 5;
    if (digits.length < minLen) {
      return Alert.alert('Invalid number', 'Please enter a complete phone number.');
    }

    setLoading(true);
    const e164 = buildE164();

    try {
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
        console.error('[sendOtp] Supabase error:', error.message, error);
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('[sendOtp] Unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push({ pathname: '/(auth)/otp', params: { phone: e164 } });
  }

  const inputStyle = {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  } as const;

  const labelStyle = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#94a3b8',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  };

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
        <Text style={labelStyle}>First Name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="John"
          placeholderTextColor="#334155"
          autoCapitalize="words"
          style={inputStyle}
        />

        {/* Last Name */}
        <Text style={labelStyle}>Last Name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Doe"
          placeholderTextColor="#334155"
          autoCapitalize="words"
          style={inputStyle}
        />

        {/* Phone */}
        <Text style={labelStyle}>Phone Number</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
          {/* Country picker button */}
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            style={{
              backgroundColor: '#0f172a',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: '#1e293b',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 20 }}>{country.flag}</Text>
            <Text style={{ color: '#f1f5f9', fontSize: 15, fontWeight: '600' }}>{country.dialCode}</Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>

          {/* Number input */}
          <TextInput
            value={formatDisplay(digits, country.dialCode)}
            onChangeText={handlePhoneChange}
            placeholder={country.dialCode === '+1' ? '(555) 000-0000' : 'Phone number'}
            placeholderTextColor="#334155"
            keyboardType="phone-pad"
            autoComplete="tel"
            style={{
              flex: 1,
              backgroundColor: '#0f172a',
              borderRadius: 14,
              paddingHorizontal: 18,
              paddingVertical: 16,
              fontSize: 16,
              color: '#f1f5f9',
              borderWidth: 1,
              borderColor: '#1e293b',
            }}
          />
        </View>

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

      {/* Country Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' }}>
            {/* Modal header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff' }}>Select Country</Text>
              <TouchableOpacity onPress={() => { setPickerVisible(false); setSearch(''); }}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 14, gap: 10 }}>
                <Ionicons name="search" size={16} color="#64748b" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search country or code"
                  placeholderTextColor="#475569"
                  style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#f1f5f9' }}
                />
              </View>
            </View>

            {/* List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => `${item.name}-${item.dialCode}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCountry(item);
                    setDigits('');
                    setPickerVisible(false);
                    setSearch('');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#1e293b',
                    backgroundColor: item.name === country.name && item.dialCode === country.dialCode ? '#1e293b' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 14 }}>{item.flag}</Text>
                  <Text style={{ flex: 1, fontSize: 15, color: '#f1f5f9' }}>{item.name}</Text>
                  <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600' }}>{item.dialCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
