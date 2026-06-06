-- Invite join RPC: bypasses RLS so an authenticated non-member can join via invite code
create or replace function public.join_group_by_invite_code(code text)
returns uuid
language plpgsql security definer
as $$
declare
  v_group_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_group_id from public.groups where invite_code = upper(code);
  if v_group_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;
