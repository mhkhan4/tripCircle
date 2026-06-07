-- Allow the group creator to insert themselves as admin into their own group.
-- The previous gm_insert policy required is_group_member() AND role='member',
-- which blocked ALL group creation (solo and regular) because the creator is not
-- yet a member when they try to add themselves as admin.
drop policy if exists "gm_insert" on public.group_members;
create policy "gm_insert" on public.group_members
  for insert with check (
    -- Existing members can add other users as member
    (is_group_member(group_id) and role = 'member')
    or
    -- Group creator can add themselves as admin to their own new group
    (
      auth.uid() = user_id
      and role = 'admin'
      and exists (
        select 1 from public.groups
        where id = group_id
          and created_by = auth.uid()
      )
    )
  );
