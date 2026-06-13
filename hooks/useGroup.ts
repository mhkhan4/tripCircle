import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import type { Group, GroupMemberWithProfile, UserProfile } from '../types';

export function useGroups() {
  const { user } = useAppStore();

  return useQuery({
    queryKey: ['groups', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('group:groups(*, trips(*))')
        .eq('user_id', user!.id)
        .eq('group.is_solo', false);
      if (error) throw error;
      return data.map((d: any) => d.group).filter(Boolean) as Group[];
    },
  });
}

export function useSoloGroup() {
  const { user } = useAppStore();

  return useQuery({
    queryKey: ['solo-group', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('group_members')
        .select('group:groups!inner(*)')
        .eq('user_id', user!.id)
        .eq('group.is_solo', true)
        .maybeSingle();
      return data ? ((data as any).group as Group) : null;
    },
  });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(*, user:users(*))')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
    }) => {
      const groupId = crypto.randomUUID();
      const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Insert without .select() — RLS blocks SELECT until user is a member
      const { error: groupError } = await supabase
        .from('groups')
        .insert({ id: groupId, ...input, invite_code, created_by: user!.id });
      if (groupError) throw groupError;

      // Now add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user!.id, role: 'admin' });
      if (memberError) throw memberError;

      return { id: groupId, ...input, invite_code, created_by: user!.id, created_at: new Date().toISOString() };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (invite_code: string) => {
      const { data: group, error } = await supabase
        .from('groups')
        .select()
        .eq('invite_code', invite_code.toUpperCase())
        .single();
      if (error) throw new Error('Invalid invite code');
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user!.id, role: 'member' });
      return group;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['group-members', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupMemberWithProfile[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*, user:users(*)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return data as GroupMemberWithProfile[];
    },
  });
}

export function useSearchUsers(query: string, groupId: string) {
  const { user } = useAppStore();

  return useQuery({
    queryKey: ['user-search', query, groupId],
    enabled: !!user?.id && query.trim().length >= 2,
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user!.id)
        .limit(20);
      if (error) throw error;
      return data as UserProfile[];
    },
  });
}

export function useAddMember(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('add_member_to_group', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
}
