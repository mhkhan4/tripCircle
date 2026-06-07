-- Add location + discoverability to groups
alter table public.groups add column if not exists latitude float8;
alter table public.groups add column if not exists longitude float8;
alter table public.groups add column if not exists is_discoverable boolean not null default false;

-- Join requests table
create table if not exists public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text,
  reviewed_by uuid references public.users,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique (group_id, user_id)
);

alter table public.group_join_requests enable row level security;

create policy "jr_insert" on public.group_join_requests for insert
  with check (auth.uid() = user_id);

create policy "jr_read" on public.group_join_requests for select using (
  auth.uid() = user_id
  or exists (
    select 1 from public.group_members
    where group_id = group_join_requests.group_id
      and user_id = auth.uid()
      and role = 'admin'
  )
);

create policy "jr_update_admin" on public.group_join_requests for update using (
  exists (
    select 1 from public.group_members
    where group_id = group_join_requests.group_id
      and user_id = auth.uid()
      and role = 'admin'
  )
);

-- Haversine nearby groups (no PostGIS required)
create or replace function public.find_nearby_groups(
  p_lat float8,
  p_lng float8,
  p_radius_miles float8
)
returns table (
  id uuid,
  name text,
  description text,
  avatar_url text,
  created_at timestamptz,
  latitude float8,
  longitude float8,
  distance_miles float8,
  member_count bigint
)
language sql security definer
as $$
  select
    g.id,
    g.name,
    g.description,
    g.avatar_url,
    g.created_at,
    g.latitude,
    g.longitude,
    (
      3959 * acos(
        least(1.0,
          cos(radians(p_lat)) * cos(radians(g.latitude))
          * cos(radians(g.longitude) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(g.latitude))
        )
      )
    ) as distance_miles,
    (select count(*) from public.group_members gm where gm.group_id = g.id) as member_count
  from public.groups g
  where
    g.is_discoverable = true
    and g.latitude is not null
    and g.longitude is not null
    and g.is_solo = false
    and not exists (
      select 1 from public.group_members gm2
      where gm2.group_id = g.id and gm2.user_id = auth.uid()
    )
    and (
      3959 * acos(
        least(1.0,
          cos(radians(p_lat)) * cos(radians(g.latitude))
          * cos(radians(g.longitude) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(g.latitude))
        )
      )
    ) <= p_radius_miles
  order by distance_miles asc;
$$;

-- Approve a join request (inserts into group_members)
create or replace function public.approve_join_request(p_request_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_request public.group_join_requests%rowtype;
begin
  select * into v_request from public.group_join_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status != 'pending' then raise exception 'Request already reviewed'; end if;

  if not exists (
    select 1 from public.group_members
    where group_id = v_request.group_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Not authorized';
  end if;

  update public.group_join_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_request.group_id, v_request.user_id, 'member')
  on conflict (group_id, user_id) do nothing;
end;
$$;

-- Reject a join request
create or replace function public.reject_join_request(p_request_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_request public.group_join_requests%rowtype;
begin
  select * into v_request from public.group_join_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status != 'pending' then raise exception 'Request already reviewed'; end if;

  if not exists (
    select 1 from public.group_members
    where group_id = v_request.group_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Not authorized';
  end if;

  update public.group_join_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;
end;
$$;
