import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import type { NearbyGroup, GroupJoinRequest } from '../types';

export function useNearbyGroups(lat: number | null, lng: number | null, radiusMiles: number) {
  const { isGuest } = useAppStore();

  return useQuery({
    queryKey: ['nearby-groups', lat, lng, radiusMiles],
    enabled: !isGuest && lat !== null && lng !== null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_nearby_groups', {
        p_lat: lat!,
        p_lng: lng!,
        p_radius_miles: radiusMiles,
      });
      if (error) throw error;
      return data as NearbyGroup[];
    },
  });
}

export function useRequestJoinGroup() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: { group_id: string; message?: string }) => {
      const { error } = await supabase
        .from('group_join_requests')
        .insert({ group_id: input.group_id, user_id: user!.id, message: input.message ?? null });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nearby-groups'] }),
  });
}

export function useMyJoinRequests() {
  const { user, isGuest } = useAppStore();

  return useQuery({
    queryKey: ['my-join-requests', user?.id],
    enabled: !isGuest && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('*, group:groups(name, avatar_url)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (GroupJoinRequest & { group: { name: string; avatar_url: string | null } })[];
    },
  });
}

export function useGroupJoinRequests(groupId: string) {
  const { isGuest } = useAppStore();

  return useQuery({
    queryKey: ['join-requests', groupId],
    enabled: !isGuest && !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('*, user:users(*)')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as GroupJoinRequest[];
    },
  });
}

export function useApproveJoinRequest(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('approve_join_request', { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
}

export function useRejectJoinRequest(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('reject_join_request', { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['join-requests', groupId] }),
  });
}
