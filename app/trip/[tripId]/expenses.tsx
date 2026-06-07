import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useExpenses } from '../../../hooks/useBudget';
import type { Expense } from '../../../types';

const CATEGORY_ICONS: Record<string, string> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  accommodation: 'bed-outline',
  activities: 'bicycle-outline',
  shopping: 'bag-outline',
  other: 'ellipsis-horizontal-outline',
};

const CATEGORY_COLOR: Record<string, string> = {
  food: '#F59E0B',
  transport: '#3B82F6',
  accommodation: '#8B5CF6',
  activities: '#10B981',
  shopping: '#EC4899',
  other: '#94A3B8',
};

export default function SoloExpensesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { data: expenses } = useExpenses(tripId);
  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  function renderExpense({ item }: { item: Expense }) {
    const color = CATEGORY_COLOR[item.category] ?? '#94A3B8';
    return (
      <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}20` }}>
            <Ionicons name={CATEGORY_ICONS[item.category] as any} size={18} color={color} />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-gray-800 dark:text-white">{item.description}</Text>
            <Text className="text-xs capitalize text-gray-400">
              {item.category} · {format(new Date(item.created_at), 'MMM d')}
            </Text>
          </View>
          <Text className="font-bold text-gray-900 dark:text-white">${item.amount.toFixed(2)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Expenses' }} />
      <View className="mx-5 mb-4 rounded-2xl bg-primary p-4">
        <Text className="text-sm text-blue-200">Total Spent</Text>
        <Text className="text-3xl font-bold text-white">${total.toFixed(2)}</Text>
        <Text className="text-sm text-blue-200">{expenses?.length ?? 0} expenses</Text>
      </View>

      <FlatList
        data={expenses ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="receipt-outline" size={56} color="#CBD5E1" />
            <Text className="mt-3 font-semibold text-gray-600 dark:text-gray-300">No expenses yet</Text>
            <Text className="mt-1 text-sm text-gray-400">Tap "Add Expense" to log your first one.</Text>
          </View>
        }
      />

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => router.push(`/trip/${tripId}/add-expense`)}
          className="flex-row items-center gap-2 rounded-2xl bg-primary px-5 py-3 shadow-lg"
          style={{ shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="font-bold text-white">Add Expense</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
