import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useExpenses } from '../../../hooks/useBudget';
import type { Expense } from '../../../types';
import { useTheme } from '../../../hooks/useTheme';

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
  const { isDark } = useTheme();
  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  function renderExpense({ item }: { item: Expense }) {
    const color = CATEGORY_COLOR[item.category] ?? '#94A3B8';
    return (
      <View className="mb-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <View className="flex-row items-center gap-4">
          <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
            <Ionicons name={CATEGORY_ICONS[item.category] as any} size={20} color={color} />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-slate-900 dark:text-white text-base">{item.description}</Text>
            <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase mt-1">
              {item.category} · {format(new Date(item.created_at), 'MMM d')}
            </Text>
          </View>
          <Text className="font-bold text-slate-900 dark:text-white text-base">${item.amount.toFixed(2)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Expenses' }} />
      
      {/* Total Spent Premium Card */}
      <View className="mx-5 my-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <Text className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Total Spent</Text>
        <Text className="text-slate-900 text-4xl font-bold dark:text-white mt-2">${total.toFixed(2)}</Text>
        <Text className="text-slate-500 text-sm mt-1">{expenses?.length ?? 0} expenses logged</Text>
      </View>

      <FlatList
        data={expenses ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="receipt-outline" size={56} color="#CBD5E1" />
            <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">No expenses yet</Text>
            <Text className="mt-1 text-sm text-slate-500">Tap "Add Expense" to log your first one.</Text>
          </View>
        }
      />

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => router.push(`/trip/${tripId}/add-expense`)}
          activeOpacity={0.9}
          className="flex-row items-center gap-2 rounded-full bg-slate-900 px-6 py-4 shadow-md transition-all duration-200 active:scale-95 dark:bg-white"
        >
          <Ionicons name="add" size={20} color={isDark ? '#0f172a' : 'white'} />
          <Text className="font-bold text-white dark:text-slate-900">Add Expense</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

