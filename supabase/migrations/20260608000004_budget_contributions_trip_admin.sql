-- Allow trip creator/admin to mark contributions paid (not just group admin)
drop policy if exists "bc_update" on public.budget_contributions;
create policy "bc_update" on public.budget_contributions for update using (
  auth.uid() = user_id
  or exists (
    select 1 from public.budgets b
    where b.id = budget_id and public.is_trip_admin(b.trip_id)
  )
);

drop policy if exists "bc_insert" on public.budget_contributions;
create policy "bc_insert" on public.budget_contributions for insert with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.budgets b
    where b.id = budget_id and public.is_trip_admin(b.trip_id)
  )
);
