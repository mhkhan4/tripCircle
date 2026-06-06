import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { GUEST_TRIP } from '../lib/guestData';
import type { Trip, TripStatus } from '../types';

export function useTrips(groupId: string) {
  const { isGuest } = useAppStore();

  return useQuery({
    queryKey: ['trips', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (isGuest) return [GUEST_TRIP];
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('group_id', groupId)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as Trip[];
    },
  });
}

export function useTrip(tripId: string) {
  const { isGuest } = useAppStore();

  return useQuery({
    queryKey: ['trip', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      if (isGuest) return GUEST_TRIP;
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();
      if (error) throw error;
      return data as Trip;
    },
  });
}

export function useAllTrips() {
  const { user, isGuest } = useAppStore();

  return useQuery({
    queryKey: ['all-trips', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (isGuest) return [GUEST_TRIP];
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id);
      const groupIds = memberships?.map((m: any) => m.group_id) ?? [];
      if (!groupIds.length) return [];
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .in('group_id', groupIds)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as Trip[];
    },
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: Omit<Trip, 'id' | 'created_by' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('trips')
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trips', data.group_id] });
      queryClient.invalidateQueries({ queryKey: ['all-trips'] });
    },
  });
}

export function useUpdateTripStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: TripStatus }) => {
      const { data, error } = await supabase
        .from('trips')
        .update({ status })
        .eq('id', tripId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trip', data.id] });
      queryClient.invalidateQueries({ queryKey: ['trips', data.group_id] });
    },
  });
}
