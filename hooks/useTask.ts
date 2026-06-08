import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import type { TripTask, TaskCategory } from '../types';

export function useTripTasks(tripId: string) {
  return useQuery({
    queryKey: ['tasks', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_tasks')
        .select('*, assignee:users!assigned_to(id, full_name, avatar_url)')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TripTask[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: {
      trip_id: string;
      title: string;
      category: TaskCategory;
      assigned_to?: string | null;
      due_date?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('trip_tasks')
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', vars.trip_id] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async ({ task_id, trip_id, completed }: { task_id: string; trip_id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('trip_tasks')
        .update({
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user!.id : null,
        })
        .eq('id', task_id);
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', vars.trip_id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ task_id, trip_id }: { task_id: string; trip_id: string }) => {
      const { error } = await supabase.from('trip_tasks').delete().eq('id', task_id);
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', vars.trip_id] });
    },
  });
}
