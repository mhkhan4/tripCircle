-- trip_poll_options and trip_poll_votes had RLS enabled but no DELETE policy.
-- FK CASCADE from trip_polls runs in the current user's security context, so
-- RLS applies to the cascade. Without DELETE policies, the cascade is denied,
-- rolling back the entire poll deletion.

-- Allow deleting options when the caller can delete the parent poll
create policy "poll_options_delete" on public.trip_poll_options for delete using (
  exists (
    select 1 from public.trip_polls p
    where p.id = poll_id
      and (p.created_by = auth.uid() or public.is_trip_admin(p.trip_id))
  )
);

-- Users can retract their own vote; poll creator / trip admin can wipe all votes
create policy "poll_votes_delete" on public.trip_poll_votes for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.trip_polls p
    where p.id = poll_id
      and (p.created_by = auth.uid() or public.is_trip_admin(p.trip_id))
  )
);
