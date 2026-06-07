-- Decouple solo trips from the groups table.
-- Solo trips now own themselves via user_id; group trips keep group_id.

alter table public.trips alter column group_id drop not null;

alter table public.trips add column if not exists user_id uuid references public.users;

alter table public.trips add constraint trips_owner_xor check (
  (group_id is not null and user_id is null) or
  (group_id is null  and user_id is not null)
);

-- trips
drop policy if exists "trips_read"   on public.trips;
drop policy if exists "trips_insert" on public.trips;
drop policy if exists "trips_update" on public.trips;

create policy "trips_read" on public.trips for select using (
  (group_id is not null and is_group_member(group_id))
  or (group_id is null and user_id = auth.uid())
);
create policy "trips_insert" on public.trips for insert with check (
  auth.uid() = created_by and (
    (group_id is not null and is_group_member(group_id))
    or (group_id is null and user_id = auth.uid())
  )
);
create policy "trips_update" on public.trips for update using (
  (group_id is not null and is_group_member(group_id))
  or (group_id is null and user_id = auth.uid())
);

-- budgets
drop policy if exists "budgets_read" on public.budgets;
create policy "budgets_read" on public.budgets for select using (
  exists (
    select 1 from public.trips t where t.id = trip_id and (
      (t.group_id is not null and is_group_member(t.group_id))
      or (t.group_id is null and t.user_id = auth.uid())
    )
  )
);

-- expenses
drop policy if exists "expenses_read" on public.expenses;
create policy "expenses_read" on public.expenses for select using (
  exists (
    select 1 from public.trips t where t.id = trip_id and (
      (t.group_id is not null and is_group_member(t.group_id))
      or (t.group_id is null and t.user_id = auth.uid())
    )
  )
);

-- trip_members: allow solo trip owner to read/insert
drop policy if exists "tm_read"   on public.trip_members;
drop policy if exists "tm_insert" on public.trip_members;

create policy "tm_read" on public.trip_members for select using (
  exists (
    select 1 from public.trips t
    left join public.group_members gm
      on gm.group_id = t.group_id and gm.user_id = auth.uid()
    where t.id = trip_id and (
      gm.user_id is not null
      or (t.group_id is null and t.user_id = auth.uid())
    )
  )
);
create policy "tm_insert" on public.trip_members for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.trips t
    left join public.group_members gm
      on gm.group_id = t.group_id and gm.user_id = auth.uid()
    where t.id = trip_id and (
      gm.user_id is not null
      or (t.group_id is null and t.user_id = auth.uid())
    )
  )
);
