import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useBudget, useCreateBudget, useBudgetSummary } from '../../../hooks/useBudget';

export default function SoloBudgetScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: budget } = useBudget(tripId);
  const { totalSpent, totalBudget, remaining, percentUsed } = useBudgetSummary(tripId);
  const createBudget = useCreateBudget();
  const [amount, setAmount] = useState('');

  async function handleSetBudget() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return Alert.alert('Invalid amount', 'Enter a positive number.');
    try {
      await createBudget.mutateAsync({ trip_id: tripId, total_amount: num });
      setAmount('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Budget' }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!budget ? (
          <View className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            <Text className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Set Your Budget</Text>
            <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">How much do you want to spend on this trip?</Text>
            <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Budget (USD)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              className="mb-4 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-2xl font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
            <TouchableOpacity onPress={handleSetBudget} disabled={createBudget.isPending} className="items-center rounded-2xl bg-primary py-4">
              {createBudget.isPending ? <ActivityIndicator color="white" /> : <Text className="font-bold text-white">Set Budget</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">Budget Overview</Text>
            <View className="mb-3 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(percentUsed, 100)}%`,
                  backgroundColor: percentUsed > 90 ? '#EF4444' : percentUsed > 70 ? '#F59E0B' : '#10B981',
                }}
              />
            </View>
            <View className="flex-row justify-between">
              {[
                { label: 'Total Budget', value: `$${totalBudget.toFixed(2)}` },
                { label: 'Spent', value: `$${totalSpent.toFixed(2)}` },
                { label: 'Remaining', value: `$${remaining.toFixed(2)}`, color: remaining >= 0 ? 'text-green-600' : 'text-red-500' },
              ].map(({ label, value, color }) => (
                <View key={label} className="items-center">
                  <Text className="text-xs text-gray-400">{label}</Text>
                  <Text className={`text-base font-bold ${color ?? 'text-gray-800 dark:text-white'}`}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
