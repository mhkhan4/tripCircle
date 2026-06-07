import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { GUEST_TRIP, GUEST_TRIP_MEMBER } from '../lib/guestData';
import type { Trip, TripStatus, TripMemberWithProfile } from '../types';

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
      // Auto-join creator into trip_members
      await supabase.from('trip_members').insert({ trip_id: data.id, user_id: user!.id });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trips', data.group_id] });
      queryClient.invalidateQueries({ queryKey: ['all-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-members', data.id] });
    },
  });
}

export function useTripMembers(tripId: string) {
  const { isGuest } = useAppStore();

  return useQuery({
    queryKey: ['trip-members', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      if (isGuest) return [GUEST_TRIP_MEMBER] as TripMemberWithProfile[];
      const { data, error } = await supabase
        .from('trip_members')
        .select('*, user:users(*)')
        .eq('trip_id', tripId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return data as TripMemberWithProfile[];
    },
  });
}

export function useJoinTrip() {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAppStore();

  return useMutation({
    mutationFn: async ({ tripId, groupId }: { tripId: string; groupId: string }) => {
      if (isGuest) throw new Error('Sign in to join trips');
      const { error } = await supabase
        .from('trip_members')
        .insert({ trip_id: tripId, user_id: user!.id });
      if (error) throw error;
      return { tripId, groupId };
    },
    onSuccess: ({ tripId, groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips', groupId] });
    },
  });
}

export function useLeaveTrip() {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAppStore();

  return useMutation({
    mutationFn: async ({ tripId, groupId }: { tripId: string; groupId: string }) => {
      if (isGuest) throw new Error('Sign in to manage trips');
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', user!.id);
      if (error) throw error;
      return { tripId, groupId };
    },
    onSuccess: ({ tripId, groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips', groupId] });
    },
  });
}

export function useRemoveTripMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, tripId }: { membershipId: string; tripId: string }) => {
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('id', membershipId);
      if (error) throw error;
      return { tripId };
    },
    onSuccess: ({ tripId }) => {
      queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] });
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
