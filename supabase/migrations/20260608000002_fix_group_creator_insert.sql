-- The gm_insert policy's EXISTS check on public.groups was blocked by groups_read RLS
-- (which requires is_group_member), so a creator could never see their own group to
-- satisfy the check. A SECURITY DEFINER helper bypasses RLS for that lookup only.

create or replace function public.is_group_creator(p_group_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.groups
    where id = p_group_id and created_by = auth.uid()
  );
$$;

drop policy if exists "gm_insert" on public.group_members;
create policy "gm_insert" on public.group_members
  for insert with check (
    (is_group_member(group_id) and role = 'member')
    or
    (auth.uid() = user_id and role = 'admin' and is_group_creator(group_id))
  );
