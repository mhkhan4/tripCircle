-- Add role column to trip_members for admin delegation
alter table public.trip_members
  add column if not exists role text not null default 'member'
    check (role in ('admin', 'member'));

-- Backfill: trip creators become admins
update public.trip_members tm
set role = 'admin'
from public.trips t
where tm.trip_id = t.id and tm.user_id = t.created_by;

-- Helper: is the caller a trip admin?
create or replace function public.is_trip_admin(p_trip_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role = 'admin'
  )
  or exists (
    select 1 from public.trips
    where id = p_trip_id and created_by = auth.uid()
  )
$$;

-- Allow trip admins to update member roles (but not their own)
create policy "tm_update_role" on public.trip_members for update
  using (is_trip_admin(trip_id) and user_id <> auth.uid())
  with check (is_trip_admin(trip_id) and user_id <> auth.uid());

-- Update delete policies to allow creator OR trip admin

drop policy if exists "polls_delete" on public.trip_polls;
create policy "polls_delete" on public.trip_polls for delete using (
  auth.uid() = created_by or is_trip_admin(trip_id)
);

drop policy if exists "tasks_delete" on public.trip_tasks;
create policy "tasks_delete" on public.trip_tasks for delete using (
  auth.uid() = created_by or is_trip_admin(trip_id)
);

drop policy if exists "itinerary_delete" on public.trip_itinerary;
create policy "itinerary_delete" on public.trip_itinerary for delete using (
  auth.uid() = created_by or is_trip_admin(trip_id)
);
