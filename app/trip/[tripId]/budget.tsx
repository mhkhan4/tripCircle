import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useBudget, useCreateBudget, useBudgetSummary } from '../../../hooks/useBudget';
import { useTheme } from '../../../hooks/useTheme';

export default function SoloBudgetScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: budget } = useBudget(tripId);
  const { totalSpent, totalBudget, remaining, percentUsed } = useBudgetSummary(tripId);
  const createBudget = useCreateBudget();
  const [amount, setAmount] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);
  const { isDark } = useTheme();

  async function handleSetBudget() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setAlertInfo({ title: 'Invalid Amount', message: 'Enter a positive number.' });
      return;
    }
    try {
      await createBudget.mutateAsync({ trip_id: tripId, total_amount: num });
      setAmount('');
    } catch (e: any) {
      setAlertInfo({ title: 'Error', message: e.message });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Budget' }} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {!budget ? (
          <View className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <Text className="mb-1 text-slate-900 text-lg font-bold dark:text-white">Set Your Budget</Text>
            <Text className="mb-6 text-sm text-slate-500 dark:text-gray-400">How much do you want to spend on this trip?</Text>
            <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Total Budget (USD)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              className="mb-6 rounded-xl border border-slate-100 bg-white px-4 py-4 text-3xl font-extrabold text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <TouchableOpacity
              onPress={handleSetBudget}
              disabled={createBudget.isPending}
              className="items-center rounded-xl bg-slate-900 py-4 transition-all duration-200 active:scale-95 dark:bg-white"
            >
              {createBudget.isPending ? (
                <ActivityIndicator color={isDark ? '#0f172a' : '#ffffff'} />
              ) : (
                <Text className="font-bold text-white dark:text-slate-900 uppercase tracking-wider text-xs">Set Budget</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <Text className="mb-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">Budget Overview</Text>
            
            <View className="my-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-850">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(percentUsed, 100)}%`,
                  backgroundColor: percentUsed > 90 ? '#EF4444' : percentUsed > 70 ? '#F59E0B' : '#10B981',
                }}
              />
            </View>
            
            <View className="flex-row justify-between pt-2 border-t border-slate-50 dark:border-gray-700">
              {[
                { label: 'Total Budget', value: `$${totalBudget.toFixed(2)}`, color: 'text-slate-900 dark:text-white' },
                { label: 'Spent', value: `$${totalSpent.toFixed(2)}`, color: 'text-slate-900 dark:text-white' },
                { label: 'Remaining', value: `$${remaining.toFixed(2)}`, color: remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
              ].map(({ label, value, color }) => (
                <View key={label} className="items-center flex-1">
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-550 tracking-wider uppercase mb-1">{label}</Text>
                  <Text className={`text-base font-extrabold ${color}`}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Custom Alert Modal */}
      <Modal visible={!!alertInfo} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-slate-100 dark:border-gray-700">
            <Text className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{alertInfo?.title}</Text>
            <Text className="mb-6 text-sm text-slate-500 dark:text-gray-400">{alertInfo?.message}</Text>
            <TouchableOpacity
              onPress={() => setAlertInfo(null)}
              className="w-full items-center rounded-xl bg-slate-900 py-3 transition-all duration-200 active:scale-95 dark:bg-white"
            >
              <Text className="font-bold text-white dark:text-slate-900">Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
