-- Allow group admins to update budget contributions on behalf of members
drop policy if exists "bc_update" on public.budget_contributions;
create policy "bc_update" on public.budget_contributions for update using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.budgets b
    join public.trips t on t.id = b.trip_id
    join public.group_members gm on gm.group_id = t.group_id
    where b.id = budget_id and gm.user_id = auth.uid() and gm.role = 'admin'
  )
);

-- Allow group admins to insert contributions on behalf of members
drop policy if exists "bc_insert" on public.budget_contributions;
create policy "bc_insert" on public.budget_contributions for insert with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.budgets b
    join public.trips t on t.id = b.trip_id
    join public.group_members gm on gm.group_id = t.group_id
    where b.id = budget_id and gm.user_id = auth.uid() and gm.role = 'admin'
  )
);
