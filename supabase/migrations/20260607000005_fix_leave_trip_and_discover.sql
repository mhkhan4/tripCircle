-- Ensure tm_delete RLS policy exists (idempotent recreate)
drop policy if exists "tm_delete" on public.trip_members;
create policy "tm_delete" on public.trip_members for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.trips
    where id = trip_id and created_by = auth.uid()
  )
);

-- Update find_nearby_groups to also exclude groups where the caller already
-- has a pending or approved join request (so the list cleans up immediately
-- after requesting, and doesn't show groups you're already waiting on).
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
    -- not already a member
    and not exists (
      select 1 from public.group_members gm2
      where gm2.group_id = g.id and gm2.user_id = auth.uid()
    )
    -- not already requested (pending or approved)
    and not exists (
      select 1 from public.group_join_requests gjr
      where gjr.group_id = g.id
        and gjr.user_id = auth.uid()
        and gjr.status in ('pending', 'approved')
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
