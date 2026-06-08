import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import type { TripPoll, PollType } from '../types';

export function useTripPolls(tripId: string) {
  const { user } = useAppStore();

  return useQuery({
    queryKey: ['polls', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data: polls, error } = await supabase
        .from('trip_polls')
        .select('*, options:trip_poll_options(id, label)')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!polls || polls.length === 0) return [] as TripPoll[];

      const pollIds = polls.map((p) => p.id);
      const { data: votes, error: votesError } = await supabase
        .from('trip_poll_votes')
        .select('poll_id, option_id, user_id')
        .in('poll_id', pollIds);
      if (votesError) throw votesError;

      return polls.map((poll) => ({
        ...poll,
        options: poll.options ?? [],
        votes: votes?.filter((v) => v.poll_id === poll.id) ?? [],
        myVote: votes?.find((v) => v.poll_id === poll.id && v.user_id === user?.id)?.option_id ?? null,
      })) as TripPoll[];
    },
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: {
      trip_id: string;
      question: string;
      poll_type: PollType;
      closes_at: string;
      options: string[];
    }) => {
      if (!user) throw new Error('Not signed in');
      const { options, ...pollData } = input;
      const { data: poll, error } = await supabase
        .from('trip_polls')
        .insert({ ...pollData, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      const { error: optErr } = await supabase
        .from('trip_poll_options')
        .insert(options.map((label) => ({ poll_id: poll.id, label })));
      if (optErr) {
        await supabase.from('trip_polls').delete().eq('id', poll.id);
        throw optErr;
      }

      return poll;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['polls', vars.trip_id] });
    },
  });
}

export function useVote() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: { poll_id: string; option_id: string; trip_id: string }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('trip_poll_votes').upsert(
        { poll_id: input.poll_id, option_id: input.option_id, user_id: user.id },
        { onConflict: 'poll_id,user_id' }
      );
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['polls', vars.trip_id] });
    },
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ poll_id, trip_id }: { poll_id: string; trip_id: string }) => {
      const { error } = await supabase.from('trip_polls').delete().eq('id', poll_id);
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['polls', vars.trip_id] });
    },
  });
}
