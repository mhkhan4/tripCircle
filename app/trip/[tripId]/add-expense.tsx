import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { scanReceipt } from '../../../lib/gemini';
import { useAddExpense } from '../../../hooks/useBudget';
import { useAppStore } from '../../../store/useAppStore';
import type { ExpenseCategory } from '../../../types';

const CATEGORIES: ExpenseCategory[] = ['food', 'transport', 'accommodation', 'activities', 'shopping', 'other'];

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  accommodation: 'bed-outline',
  activities: 'bicycle-outline',
  shopping: 'bag-outline',
  other: 'ellipsis-horizontal-outline',
};

export default function SoloAddExpenseScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { user } = useAppStore();
  const addExpense = useAddExpense();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [ocrRaw, setOcrRaw] = useState<Record<string, unknown> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function pickReceipt() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setReceiptUri(asset.uri);
    setScanning(true);
    try {
      const ocr = await scanReceipt(asset.base64!);
      setOcrRaw({ ...ocr });
      if (ocr.amount) setAmount(ocr.amount.toString());
      if (ocr.merchant) setDescription(ocr.merchant);
      if (ocr.category) setCategory(ocr.category);
    } catch {
      Alert.alert('Scan failed', 'Could not read the receipt. Fill in manually.');
    } finally {
      setScanning(false);
    }
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `receipts/${tripId}/${Date.now()}.${ext}`;
      const byteArray = Uint8Array.from(atob(asset.base64!), (c) => c.charCodeAt(0));
      const { error } = await supabase.storage.from('receipts').upload(path, byteArray, { contentType: `image/${ext}` });
      if (!error) {
        const { data } = supabase.storage.from('receipts').getPublicUrl(path);
        setReceiptUrl(data.publicUrl);
      }
    } catch {
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return Alert.alert('Invalid amount', 'Enter a valid expense amount.');
    if (!description.trim()) return Alert.alert('Required', 'Add a description.');
    try {
      await addExpense.mutateAsync({
        trip_id: tripId,
        amount: num,
        category,
        description: description.trim(),
        receipt_url: receiptUrl ?? undefined,
        ocr_raw: ocrRaw ?? undefined,
        splits: [{ user_id: user!.id, share_amount: num }],
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Add Expense' }} />
      <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Add Expense</Text>
        <Text className="mb-5 text-sm text-gray-500 dark:text-gray-400">Scan a receipt or enter manually.</Text>

        <TouchableOpacity
          onPress={pickReceipt}
          disabled={scanning || uploading}
          className="mb-5 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 py-5"
        >
          {scanning ? (
            <><ActivityIndicator color="#2563EB" /><Text className="text-sm font-semibold text-primary">Scanning receipt...</Text></>
          ) : uploading ? (
            <><ActivityIndicator color="#2563EB" /><Text className="text-sm font-semibold text-primary">Uploading...</Text></>
          ) : receiptUri ? (
            <View className="items-center">
              <Image source={{ uri: receiptUri }} className="h-24 w-40 rounded-xl" resizeMode="cover" />
              <Text className="mt-2 text-xs font-semibold text-green-600">Receipt scanned</Text>
            </View>
          ) : (
            <><Ionicons name="camera-outline" size={22} color="#2563EB" /><Text className="text-sm font-semibold text-primary">Scan Receipt</Text></>
          )}
        </TouchableOpacity>

        <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount (USD) *</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor="#94A3B8"
          keyboardType="decimal-pad"
          className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-2xl font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Description *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Dinner at beach restaurant"
          placeholderTextColor="#94A3B8"
          className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Category</Text>
        <View className="mb-8 flex-row flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              className="flex-row items-center gap-1 rounded-xl border px-3 py-2"
              style={{
                backgroundColor: category === cat ? '#2563EB' : 'transparent',
                borderColor: category === cat ? '#2563EB' : '#E2E8F0',
              }}
            >
              <Ionicons name={CATEGORY_ICONS[cat] as any} size={14} color={category === cat ? 'white' : '#64748B'} />
              <Text className="text-sm capitalize" style={{ color: category === cat ? 'white' : '#374151', fontWeight: category === cat ? '600' : '400' }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View className="px-5 pb-6">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={addExpense.isPending}
          className="items-center rounded-2xl bg-primary py-4"
        >
          {addExpense.isPending ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">Save Expense</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
