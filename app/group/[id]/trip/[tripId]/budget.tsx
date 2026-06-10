import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useGroup } from '../../../../../hooks/useGroup';
import { useTrip } from '../../../../../hooks/useTrip';
import { useBudget, useCreateBudget, useBudgetSummary, useMarkContributionPaid } from '../../../../../hooks/useBudget';
import { useAppStore } from '../../../../../store/useAppStore';
import { supabase } from '../../../../../lib/supabase';
import { useTheme } from '../../../../../hooks/useTheme';

type BudgetMode = 'total' | 'per_person';

export default function BudgetScreen() {
  const { id: groupId, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const { user } = useAppStore();
  const { data: group } = useGroup(groupId);
  const { data: trip } = useTrip(tripId);
  const { data: budget } = useBudget(tripId);
  const { totalSpent, totalBudget, remaining, percentUsed } = useBudgetSummary(tripId);
  const createBudget = useCreateBudget();
  const markPaid = useMarkContributionPaid();
  const { isDark } = useTheme();

  const members = (group as any)?.group_members ?? [];
  const isAdmin =
    trip?.created_by === user?.id ||
    members.some((m: any) => m.user_id === user?.id && m.role === 'admin');
  const memberCount = Math.max(members.length, 1);

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<BudgetMode>('total');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<{ userId: string; name: string; share: number } | null>(null);
  const [markPaidInput, setMarkPaidInput] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  const enteredNum = parseFloat(amount) || 0;
  const computedTotal = mode === 'per_person' ? enteredNum * memberCount : enteredNum;
  const computedPerPerson = mode === 'total' ? enteredNum / memberCount : enteredNum;

  async function handleSendReminder() {
    if (!budget || !user) return;
    const unpaid = members.filter((m: any) => {
      const c = budget.budget_contributions?.find((c: any) => c.user_id === m.user_id);
      return !c || !(c.paid_amount > 0);
    });
    if (unpaid.length === 0) {
      setAlertInfo({ title: 'All Paid!', message: 'Everyone has paid their contribution.' });
      return;
    }
    const names = unpaid.map((m: any) => m.user?.full_name?.split(' ')[0] ?? 'Member').join(', ');
    setSendingReminder(true);
    try {
      await supabase.from('messages').insert({
        group_id: groupId,
        trip_id: tripId,
        sender_id: user.id,
        content: `Payment reminder: ${names} ${unpaid.length === 1 ? 'hasn\'t' : 'haven\'t'} paid their contribution yet. Please pay before the trip!`,
      });
      setAlertInfo({ title: 'Reminder Sent', message: 'A message was posted in the trip chat.' });
    } catch (e: any) {
      setAlertInfo({ title: 'Error', message: e.message });
    } finally {
      setSendingReminder(false);
    }
  }

  async function handleSetBudget() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setAlertInfo({ title: 'Invalid Amount', message: 'Enter a positive number.' });
      return;
    }
    const total = mode === 'per_person' ? num * memberCount : num;
    const perPerson = mode === 'per_person' ? num : undefined;
    try {
      await createBudget.mutateAsync({ trip_id: tripId, total_amount: total, per_person_amount: perPerson });
      setAmount('');
    } catch (e: any) {
      setAlertInfo({ title: 'Error', message: e.message });
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
      setAlertInfo({ title: 'Error', message: e.message });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Budget' }} />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {!budget ? (
          <View className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <Text className="mb-1 text-slate-900 text-lg font-bold dark:text-white">Set Trip Budget</Text>
            <Text className="mb-6 text-sm text-slate-500 dark:text-gray-400">Set a total or per-person budget for this trip.</Text>

            {/* Mode toggle */}
            <View className="mb-6 flex-row rounded-xl border border-slate-100 bg-slate-100/50 p-1 dark:border-gray-700 dark:bg-gray-900">
              {(['total', 'per_person'] as BudgetMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  className="flex-1 items-center rounded-lg py-2 transition-all duration-200 active:scale-95"
                  style={{ backgroundColor: mode === m ? (isDark ? '#ffffff' : '#0f172a') : 'transparent' }}
                >
                  <Text
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: mode === m ? (isDark ? '#0f172a' : '#ffffff') : '#64748B' }}
                  >
                    {m === 'total' ? 'Total Budget' : 'Per Person'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">
              {mode === 'total' ? 'Total Budget (USD)' : 'Amount per Person (USD)'}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              className="mb-4 rounded-xl border border-slate-100 bg-white px-4 py-4 text-3xl font-extrabold text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />

            {enteredNum > 0 && (
              <View className="mb-6 rounded-xl bg-blue-50/50 p-4 dark:bg-blue-950 border border-blue-100/50 dark:border-blue-900">
                {mode === 'per_person' ? (
                  <Text className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                    ${enteredNum.toFixed(2)}/person × {memberCount} members = <Text className="font-bold">${computedTotal.toFixed(2)} total</Text>
                    {'\n'}Budget auto-increases when new members join.
                  </Text>
                ) : (
                  <Text className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                    ${computedPerPerson.toFixed(2)}/person split across {memberCount} members
                  </Text>
                )}
              </View>
            )}

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
          <View className="gap-6">
            <View className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <Text className="mb-1 text-slate-400 text-xs font-semibold tracking-wider uppercase">Budget Overview</Text>

              {budget.per_person_amount && (
                <View className="mb-4 mt-2 rounded-xl bg-blue-50/50 px-4 py-3 dark:bg-blue-950 border border-blue-100/50 dark:border-blue-900">
                  <Text className="text-xs text-blue-600 dark:text-blue-300 font-semibold leading-relaxed">
                    Per-person budget: ${budget.per_person_amount.toFixed(2)} × {memberCount} members — auto-scales when members join
                  </Text>
                </View>
              )}

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

            <View className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <View className="mb-6 flex-row items-center justify-between">
                <Text className="text-slate-900 text-lg font-bold dark:text-white">Member Contributions</Text>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={handleSendReminder}
                    disabled={sendingReminder}
                    className="flex-row items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-2 transition-all duration-200 active:scale-95 dark:bg-amber-900 border border-amber-100/50 dark:border-amber-900"
                  >
                    {sendingReminder ? (
                      <ActivityIndicator size="small" color="#D97706" />
                    ) : (
                      <Ionicons name="notifications-outline" size={14} color="#D97706" />
                    )}
                    <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Remind</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="gap-4">
                {members.map((m: any) => {
                  const contribution = budget?.budget_contributions?.find((c: any) => c.user_id === m.user_id);
                  const share = budget.per_person_amount ?? totalBudget / memberCount;
                  const isPaid = contribution && contribution.paid_amount > 0;

                  function openMarkPaid() {
                    setMarkPaidTarget({ userId: m.user_id, name: m.user?.full_name ?? 'Member', share });
                    setMarkPaidInput(share.toFixed(2));
                  }

                  return (
                    <View key={m.user_id} className="flex-row items-center justify-between border-b border-slate-50 py-3 last:border-b-0 dark:border-gray-700">
                      <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-800 border border-slate-200/50 dark:border-gray-700">
                          <Text className="text-sm font-bold text-slate-650 dark:text-slate-300">
                            {m.user?.full_name?.[0]?.toUpperCase() ?? m.user?.email?.[0]?.toUpperCase() ?? '?'}
                          </Text>
                        </View>
                        <View>
                          <Text className="font-semibold text-slate-900 dark:text-white">{m.user?.full_name ?? 'Member'}</Text>
                          <Text className="text-xs text-slate-400 dark:text-gray-500 font-medium">Share: ${share.toFixed(2)}</Text>
                        </View>
                      </View>
                      {isPaid ? (
                        <View className="flex-row items-center gap-1.5 bg-emerald-50/50 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900">
                          <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                          <Text className="font-bold text-xs text-emerald-600 dark:text-emerald-400">Paid ${contribution!.paid_amount.toFixed(2)}</Text>
                          {isAdmin && (
                            <TouchableOpacity onPress={openMarkPaid} className="ml-1.5 p-1 transition-all duration-200 active:scale-95 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                              <Ionicons name="pencil" size={11} color="#64748B" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-2">
                          <View className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-1.5 dark:border-amber-900 dark:bg-amber-950">
                            <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending</Text>
                          </View>
                          {isAdmin && (
                            <TouchableOpacity onPress={openMarkPaid} className="rounded-full bg-slate-900 p-2 transition-all duration-200 active:scale-95 dark:bg-white">
                              <Ionicons name="checkmark" size={14} color={isDark ? '#0f172a' : '#ffffff'} />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Mark Paid Modal */}
      <Modal visible={!!markPaidTarget} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-slate-100 dark:border-gray-700">
            <Text className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Mark as Paid</Text>
            <Text className="mb-4 text-sm text-slate-500 dark:text-gray-400">
              How much did {markPaidTarget?.name} pay? (share: ${markPaidTarget?.share.toFixed(2)})
            </Text>
            <TextInput
              value={markPaidInput}
              onChangeText={setMarkPaidInput}
              keyboardType="decimal-pad"
              className="mb-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-2xl font-bold text-slate-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setMarkPaidTarget(null)}
                className="flex-1 items-center rounded-xl border border-slate-100 bg-white py-3 transition-all duration-200 active:scale-95 dark:border-gray-700 dark:bg-gray-900"
              >
                <Text className="font-semibold text-slate-500 dark:text-gray-400">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmMarkPaid}
                disabled={markPaid.isPending}
                className="flex-1 items-center rounded-xl bg-slate-900 py-3 transition-all duration-200 active:scale-95 dark:bg-white"
              >
                {markPaid.isPending ? (
                  <ActivityIndicator color={isDark ? '#0f172a' : '#ffffff'} size="small" />
                ) : (
                  <Text className="font-bold text-white dark:text-slate-900">Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
