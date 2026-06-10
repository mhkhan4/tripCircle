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
import { useTheme } from '../../../hooks/useTheme';
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
  const { isDark } = useTheme();

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

    // File Type & Size Validation
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      Alert.alert('Unsupported format', 'Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert('File too large', 'Receipt image size must be smaller than 10MB.');
      return;
    }

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
      const path = `receipts/${tripId}/${Date.now()}.${ext}`;
      const byteArray = Uint8Array.from(atob(asset.base64!), (c) => c.charCodeAt(0));
      const { error } = await supabase.storage.from('receipts').upload(path, byteArray, { contentType: `image/${ext}` });
      if (error) throw error;
      const { data } = supabase.storage.from('receipts').getPublicUrl(path);
      setReceiptUrl(data.publicUrl);
    } catch (e) {
      Alert.alert('Upload failed', 'Receipt upload failed. You can still save the expense without it.');
      setReceiptUri(null);
      setReceiptUrl(null);
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
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-slate-950/60" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Add Expense' }} />
      <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="text-slate-900 text-2xl font-bold dark:text-white">Add Expense</Text>
        <Text className="mb-6 text-sm text-slate-500">Scan a receipt or enter manually.</Text>

        <TouchableOpacity
          onPress={pickReceipt}
          disabled={scanning || uploading}
          activeOpacity={0.8}
          className="mb-8 flex-row items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-6 shadow-sm transition-all duration-200 active:scale-98 dark:border-slate-800 dark:bg-slate-900"
        >
          {scanning ? (
            <>
              <ActivityIndicator color="#0f172a" />
              <Text className="text-sm font-semibold text-slate-900 dark:text-white">Scanning receipt...</Text>
            </>
          ) : uploading ? (
            <>
              <ActivityIndicator color="#0f172a" />
              <Text className="text-sm font-semibold text-slate-900 dark:text-white">Uploading...</Text>
            </>
          ) : receiptUri ? (
            <View className="items-center">
              <Image source={{ uri: receiptUri }} className="h-24 w-40 rounded-xl" resizeMode="cover" />
              <Text className="mt-2 text-xs text-green-600 font-semibold uppercase tracking-wider">Receipt scanned</Text>
            </View>
          ) : (
            <>
              <Ionicons name="camera-outline" size={22} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Scan Receipt</Text>
            </>
          )}
        </TouchableOpacity>

        <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Amount (USD) *</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor="#94A3B8"
          keyboardType="decimal-pad"
          className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-3xl font-extrabold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />

        <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Description *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Dinner at beach restaurant"
          placeholderTextColor="#94A3B8"
          className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />

        <Text className="mb-3 text-slate-400 text-xs font-semibold tracking-wider uppercase">Category</Text>
        <View className="mb-8 flex-row flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              className="flex-row items-center gap-1.5 rounded-full border px-4 py-2.5 transition-all duration-150 active:scale-95"
              style={{
                backgroundColor: category === cat ? (isDark ? 'white' : '#0f172a') : 'transparent',
                borderColor: category === cat ? (isDark ? 'white' : '#0f172a') : (isDark ? '#334155' : '#e2e8f0'),
              }}
            >
              <Ionicons
                name={CATEGORY_ICONS[cat] as any}
                size={14}
                color={category === cat ? (isDark ? '#0f172a' : 'white') : '#64748B'}
              />
              <Text
                className="text-sm capitalize font-semibold"
                style={{
                  color: category === cat ? (isDark ? '#0f172a' : 'white') : (isDark ? '#cbd5e1' : '#334155'),
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View className="px-5 pb-6">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={addExpense.isPending || uploading}
          activeOpacity={0.9}
          className="items-center justify-center rounded-xl bg-slate-900 py-4 shadow-sm transition-all duration-200 active:scale-95 dark:bg-white"
        >
          {addExpense.isPending || uploading ? (
            <ActivityIndicator color={isDark ? '#0f172a' : 'white'} />
          ) : (
            <Text className="text-base font-bold text-white dark:text-slate-900">Save Expense</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
