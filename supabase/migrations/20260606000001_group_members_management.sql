-- Add username column to users
alter table public.users
  add column if not exists username text unique;

-- Trigram indexes for fast name/username search
create extension if not exists pg_trgm;
create index if not exists users_full_name_trgm on public.users using gin (full_name gin_trgm_ops);
create index if not exists users_username_trgm on public.users using gin (username gin_trgm_ops);

-- Fix gm_insert: only existing members can add others, and inserted role is forced to 'member'
drop policy if exists "gm_insert" on public.group_members;
create policy "gm_insert" on public.group_members
  for insert with check (
    is_group_member(group_id)
    and role = 'member'
  );

-- Add gm_delete: only admins can remove, cannot remove themselves
drop policy if exists "gm_delete" on public.group_members;
create policy "gm_delete" on public.group_members
  for delete using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
    and user_id <> auth.uid()
  );

-- RPC: any group member can add an existing TripOrbit user directly
create or replace function public.add_member_to_group(
  p_group_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql security definer
as $$
begin
  if not is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;

  if not exists (select 1 from public.users where id = p_target_user_id) then
    raise exception 'User not found';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (p_group_id, p_target_user_id, 'member')
  on conflict (group_id, user_id) do nothing;
end;
$$;
