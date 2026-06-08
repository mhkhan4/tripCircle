import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import type { ItineraryEntry, ItineraryEntryType } from '../types';

export function useTripItinerary(tripId: string) {
  return useQuery({
    queryKey: ['itinerary', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_itinerary')
        .select('*')
        .eq('trip_id', tripId)
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return data as ItineraryEntry[];
    },
  });
}

export function useAddItineraryEntry() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  return useMutation({
    mutationFn: async (input: {
      trip_id: string;
      entry_type: ItineraryEntryType;
      title: string;
      starts_at?: string | null;
      ends_at?: string | null;
      confirmation_number?: string | null;
      link?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('trip_itinerary')
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', vars.trip_id] });
    },
  });
}

export function useDeleteItineraryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entry_id, trip_id }: { entry_id: string; trip_id: string }) => {
      const { error } = await supabase.from('trip_itinerary').delete().eq('id', entry_id);
      if (error) throw error;
      return { trip_id };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', vars.trip_id] });
    },
  });
}
