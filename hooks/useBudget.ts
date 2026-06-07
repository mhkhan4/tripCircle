import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { GUEST_BUDGET, GUEST_EXPENSES } from '../lib/guestData';
import type { Budget, BudgetContribution, Expense } from '../types';

export function useBudget(tripId: string) {
  const { isGuest } = useAppStore();

  return useQuery({
    queryKey: ['budget', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      if (isGuest) return GUEST_BUDGET;
      const { data, error } = await supabase
        .from('budgets')
        .select('*, budget_contributions(*, user:users(*))')
        .eq('trip_id', tripId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as (Budget & { budget_contributions: BudgetContribution[] }) | null;
    },
  });
}

export function useExpenses(tripId: string) {
  const { isGuest } = useAppStore();

  return useQuery({
    queryKey: ['expenses', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      if (isGuest) return GUEST_EXPENSES;
      const { data, error } = await supabase
        .from('expenses')
        .select('*, payer:users!paid_by(*), splits:expense_splits(*, user:users(*))')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: { trip_id: string; total_amount: number; per_person_amount?: number; currency?: string }) => {
      const { data, error } = await supabase
        .from('budgets')
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ['budget', data.trip_id] }),
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: {
      trip_id: string;
      amount: number;
      category: string;
      description: string;
      currency?: string;
      receipt_url?: string;
      ocr_raw?: Record<string, unknown>;
      splits: { user_id: string; share_amount: number }[];
    }) => {
      const { splits, ...expenseData } = input;
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({ ...expenseData, paid_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      if (splits.length > 0) {
        await supabase.from('expense_splits').insert(
          splits.map((s) => ({ ...s, expense_id: expense.id }))
        );
      }
      return expense;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', data.trip_id] });
      queryClient.invalidateQueries({ queryKey: ['budget', data.trip_id] });
    },
  });
}

export function useBudgetSummary(tripId: string) {
  const { data: budget } = useBudget(tripId);
  const { data: expenses } = useExpenses(tripId);

  const totalSpent = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const totalBudget = budget?.total_amount ?? 0;
  const remaining = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const byCategory = expenses?.reduce(
    (acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; },
    {} as Record<string, number>
  ) ?? {};

  return { totalSpent, totalBudget, remaining, percentUsed, byCategory, budget, expenses };
}
