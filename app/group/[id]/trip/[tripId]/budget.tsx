import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useGroup } from '../../../../../hooks/useGroup';
import { useBudget, useCreateBudget, useBudgetSummary, useMarkContributionPaid } from '../../../../../hooks/useBudget';
import { useAppStore } from '../../../../../store/useAppStore';
import { supabase } from '../../../../../lib/supabase';

type BudgetMode = 'total' | 'per_person';

export default function BudgetScreen() {
  const { id: groupId, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const { user } = useAppStore();
  const { data: group } = useGroup(groupId);
  const { data: budget } = useBudget(tripId);
  const { totalSpent, totalBudget, remaining, percentUsed } = useBudgetSummary(tripId);
  const createBudget = useCreateBudget();
  const markPaid = useMarkContributionPaid();

  const members = (group as any)?.group_members ?? [];
  const isAdmin = members.some((m: any) => m.user_id === user?.id && m.role === 'admin');
  const memberCount = Math.max(members.length, 1);

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<BudgetMode>('total');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<{ userId: string; name: string; share: number } | null>(null);
  const [markPaidInput, setMarkPaidInput] = useState('');

  const enteredNum = parseFloat(amount) || 0;
  const computedTotal = mode === 'per_person' ? enteredNum * memberCount : enteredNum;
  const computedPerPerson = mode === 'total' ? enteredNum / memberCount : enteredNum;

  async function handleSendReminder() {
    if (!budget || !user) return;
    const unpaid = members.filter((m: any) => {
      const c = budget.budget_contributions?.find((c: any) => c.user_id === m.user_id);
      return !c || !(c.paid_amount > 0);
    });
    if (unpaid.length === 0) return Alert.alert('All paid!', 'Everyone has paid their contribution.');
    const names = unpaid.map((m: any) => m.user?.full_name?.split(' ')[0] ?? 'Member').join(', ');
    setSendingReminder(true);
    try {
      await supabase.from('messages').insert({
        group_id: groupId,
        trip_id: tripId,
        sender_id: user.id,
        content: `Payment reminder: ${names} ${unpaid.length === 1 ? 'hasn\'t' : 'haven\'t'} paid their contribution yet. Please pay before the trip!`,
      });
      Alert.alert('Reminder sent', 'A message was posted in the trip chat.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSendingReminder(false);
    }
  }

  async function handleSetBudget() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return Alert.alert('Invalid amount', 'Enter a positive number.');
    const total = mode === 'per_person' ? num * memberCount : num;
    const perPerson = mode === 'per_person' ? num : undefined;
    try {
      await createBudget.mutateAsync({ trip_id: tripId, total_amount: total, per_person_amount: perPerson });
      setAmount('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function confirmMarkPaid() {
    if (!markPaidTarget || !budget) return;
    const num = parseFloat(markPaidInput);
    if (isNaN(num) || num <= 0) return;
    const { userId } = markPaidTarget;
    setMarkPaidTarget(null);
    try {
      await markPaid.mutateAsync({ budget_id: budget.id, user_id: userId, paid_amount: num, trip_id: tripId });
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
            <Text className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Set Trip Budget</Text>
            <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">Set a total or per-person budget for this trip.</Text>

            {/* Mode toggle */}
            <View className="mb-4 flex-row rounded-xl border border-gray-200 p-1 dark:border-gray-700">
              {(['total', 'per_person'] as BudgetMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  className="flex-1 items-center rounded-lg py-2"
                  style={{ backgroundColor: mode === m ? '#2563EB' : 'transparent' }}
                >
                  <Text className="text-sm font-semibold" style={{ color: mode === m ? 'white' : '#64748B' }}>
                    {m === 'total' ? 'Total Budget' : 'Per Person'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {mode === 'total' ? 'Total Budget (USD)' : 'Amount per Person (USD)'}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              className="mb-3 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-2xl font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />

            {enteredNum > 0 && (
              <View className="mb-4 rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
                {mode === 'per_person' ? (
                  <Text className="text-sm text-blue-700 dark:text-blue-300">
                    ${enteredNum.toFixed(2)}/person × {memberCount} members = <Text className="font-bold">${computedTotal.toFixed(2)} total</Text>
                    {'\n'}Budget auto-increases when new members join.
                  </Text>
                ) : (
                  <Text className="text-sm text-blue-700 dark:text-blue-300">
                    ${computedPerPerson.toFixed(2)}/person split across {memberCount} members
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity onPress={handleSetBudget} disabled={createBudget.isPending} className="items-center rounded-2xl bg-primary py-4">
              {createBudget.isPending ? <ActivityIndicator color="white" /> : <Text className="font-bold text-white">Set Budget</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">Budget Overview</Text>

              {budget.per_person_amount && (
                <View className="mb-3 rounded-xl bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
                  <Text className="text-xs text-blue-600 dark:text-blue-300">
                    Per-person budget: ${budget.per_person_amount.toFixed(2)} × {memberCount} members — auto-scales when members join
                  </Text>
                </View>
              )}

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
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-bold text-gray-900 dark:text-white">Member Contributions</Text>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={handleSendReminder}
                    disabled={sendingReminder}
                    className="flex-row items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 dark:bg-amber-900/20"
                  >
                    {sendingReminder
                      ? <ActivityIndicator size="small" color="#D97706" />
                      : <Ionicons name="notifications-outline" size={14} color="#D97706" />}
                    <Text className="text-xs font-semibold text-amber-600 dark:text-amber-400">Remind</Text>
                  </TouchableOpacity>
                )}
              </View>
              {members.map((m: any) => {
                const contribution = budget?.budget_contributions?.find((c: any) => c.user_id === m.user_id);
                const share = budget.per_person_amount ?? totalBudget / memberCount;
                const isPaid = contribution && contribution.paid_amount > 0;

                function openMarkPaid() {
                  setMarkPaidTarget({ userId: m.user_id, name: m.user?.full_name ?? 'Member', share });
                  setMarkPaidInput(share.toFixed(2));
                }

                return (
                  <View key={m.user_id} className="mb-3 flex-row items-center gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
                      <Text className="text-sm font-bold text-white">
                        {m.user?.full_name?.[0]?.toUpperCase() ?? m.user?.email?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800 dark:text-white">{m.user?.full_name ?? 'Member'}</Text>
                      <Text className="text-xs text-gray-400">Share: ${share.toFixed(2)}</Text>
                    </View>
                    {isPaid ? (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text className="font-semibold text-green-600">Paid ${contribution!.paid_amount.toFixed(2)}</Text>
                        {isAdmin && (
                          <TouchableOpacity onPress={openMarkPaid} className="ml-1 p-1">
                            <Ionicons name="pencil" size={13} color="#94A3B8" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-2">
                        <View className="rounded-full bg-yellow-100 px-2 py-0.5 dark:bg-yellow-900/30">
                          <Text className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Pending</Text>
                        </View>
                        {isAdmin && (
                          <TouchableOpacity onPress={openMarkPaid} className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
                            <Ionicons name="checkmark" size={14} color="#16a34a" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={!!markPaidTarget} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white p-6 dark:bg-gray-900">
            <Text className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Mark as Paid</Text>
            <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              How much did {markPaidTarget?.name} pay? (share: ${markPaidTarget?.share.toFixed(2)})
            </Text>
            <TextInput
              value={markPaidInput}
              onChangeText={setMarkPaidInput}
              keyboardType="decimal-pad"
              className="mb-6 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-xl font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setMarkPaidTarget(null)}
                className="flex-1 items-center rounded-xl border border-gray-200 py-3 dark:border-gray-700"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmMarkPaid}
                disabled={markPaid.isPending}
                className="flex-1 items-center rounded-xl bg-green-500 py-3"
              >
                {markPaid.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text className="font-bold text-white">Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
