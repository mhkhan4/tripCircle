import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useGroup } from '../../../../../hooks/useGroup';
import { useBudget, useCreateBudget, useBudgetSummary } from '../../../../../hooks/useBudget';
import { useAppStore } from '../../../../../store/useAppStore';

export default function BudgetScreen() {
  const { id: groupId, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const { user } = useAppStore();
  const { data: group } = useGroup(groupId);
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

  const members = (group as any)?.group_members ?? [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!budget ? (
          <View className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            <Text className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Set Trip Budget</Text>
            <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">How much does this trip cost in total?</Text>
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
          <>
            <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
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
                  { label: 'Total Budget', value: `$${totalBudget.toFixed(2)}`, color: 'text-gray-800 dark:text-white' },
                  { label: 'Spent', value: `$${totalSpent.toFixed(2)}`, color: 'text-gray-800 dark:text-white' },
                  { label: 'Remaining', value: `$${remaining.toFixed(2)}`, color: remaining >= 0 ? 'text-green-600' : 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <View key={label} className="items-center">
                    <Text className="text-xs text-gray-400">{label}</Text>
                    <Text className={`text-base font-bold ${color}`}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">Member Contributions</Text>
              {members.map((m: any) => {
                const contribution = budget?.budget_contributions?.find((c: any) => c.user_id === m.user_id);
                const equal = totalBudget / Math.max(members.length, 1);
                return (
                  <View key={m.user_id} className="mb-3 flex-row items-center gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
                      <Text className="text-sm font-bold text-white">
                        {m.user?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800 dark:text-white">{m.user?.full_name ?? 'Member'}</Text>
                      <Text className="text-xs text-gray-400">Share: ${equal.toFixed(2)}</Text>
                    </View>
                    {contribution ? (
                      <View className="items-end">
                        <Text className="font-semibold text-green-600">Paid ${contribution.paid_amount.toFixed(2)}</Text>
                      </View>
                    ) : (
                      <View className="rounded-full bg-yellow-100 px-2 py-0.5 dark:bg-yellow-900/30">
                        <Text className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Pending</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
