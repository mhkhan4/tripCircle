# New Features Architecture

## Overview

Four features to add to TripOrbit:

1. **Budget Payment Flow** — admin can mark members as paid; "Pending" resolves to a real paid timestamp
2. **Discover Nearby Groups** — Join button opens a radius-filtered group discovery + request-to-join flow
3. **Solo Trip Planning** — users without a group can plan trips independently

---

## Feature 1: Budget Payment Status + Admin Mark-as-Paid

### Problem
`budget_contributions` has `paid_amount` and `paid_at` columns but no one can set them.  
The UI shows "Pending" for any member without a contribution row; it never transitions to "Paid" because there is no UI or backend path to record payment.

### Solution
- New Supabase RPC `mark_contribution_paid(p_budget_id, p_user_id, p_amount)` — runs as security definer, verifies caller is a group admin for the trip's group.
- Update the `bc_update` RLS policy to also allow group admins to update contributions (so the RPC can work and direct updates work too).
- Budget screen shows a **checkmark icon** next to "Pending" rows — tapping it opens an Alert asking for the paid amount. Admins only see this control.

### DB Migration (migration_004_budget_payments.sql)
```sql
-- Allow group admins to update contributions for their trips
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
```

### App Changes
- `hooks/useBudget.ts`: Add `useMarkContributionPaid` mutation
- `app/group/[id]/trip/[tripId]/budget.tsx`: Show checkmark button on Pending rows for admin users; on tap, Alert.prompt for amount

---

## Feature 2: Discover Nearby Groups + Request-to-Join

### Problem
The "Join" button on the home screen only accepts an invite code (text prompt). Users cannot discover groups organically.

### Solution
- Groups optionally store a `latitude` and `longitude` (set at creation time using the device location).
- New table `group_join_requests`: pending/approved/rejected rows per (group, user).
- New Postgres function `find_nearby_groups(lat float8, lng float8, radius_miles float8)` — Haversine distance, no PostGIS required.
- "Join" button on home screen opens a new **Discover screen** (`app/discover/index.tsx`) with a radius picker (25 / 50 / 100 miles) and a list of nearby public groups.
- Tapping a group shows its details + a **Request to Join** button.
- Group admins see a **Join Requests** badge on their group dashboard and a dedicated screen (`app/group/[id]/join-requests.tsx`) to approve or reject.
- Approving a request calls an RPC `approve_join_request(request_id)` that inserts into `group_members`.

### DB Migration (migration_005_discover.sql)
```sql
-- Add location to groups
alter table public.groups add column if not exists latitude float8;
alter table public.groups add column if not exists longitude float8;
alter table public.groups add column if not exists is_discoverable boolean not null default false;

-- Join requests
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

-- Requester can insert and read their own
create policy "jr_insert" on public.group_join_requests for insert with check (auth.uid() = user_id);
create policy "jr_read_own" on public.group_join_requests for select using (
  auth.uid() = user_id
  or exists (
    select 1 from public.group_members
    where group_id = group_join_requests.group_id and user_id = auth.uid() and role = 'admin'
  )
);
create policy "jr_update_admin" on public.group_join_requests for update using (
  exists (
    select 1 from public.group_members
    where group_id = group_join_requests.group_id and user_id = auth.uid() and role = 'admin'
  )
);

-- Haversine nearby groups (no PostGIS needed)
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
  invite_code text,
  created_by uuid,
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
    g.invite_code,
    g.created_by,
    g.created_at,
    g.latitude,
    g.longitude,
    (
      3959 * acos(
        cos(radians(p_lat)) * cos(radians(g.latitude))
        * cos(radians(g.longitude) - radians(p_lng))
        + sin(radians(p_lat)) * sin(radians(g.latitude))
      )
    ) as distance_miles,
    (select count(*) from public.group_members gm where gm.group_id = g.id) as member_count
  from public.groups g
  where
    g.is_discoverable = true
    and g.latitude is not null
    and g.longitude is not null
    and not exists (
      select 1 from public.group_members gm2
      where gm2.group_id = g.id and gm2.user_id = auth.uid()
    )
    and (
      3959 * acos(
        cos(radians(p_lat)) * cos(radians(g.latitude))
        * cos(radians(g.longitude) - radians(p_lng))
        + sin(radians(p_lat)) * sin(radians(g.latitude))
      )
    ) <= p_radius_miles
  order by distance_miles asc;
$$;

-- Approve join request RPC
create or replace function public.approve_join_request(p_request_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_request group_join_requests%rowtype;
begin
  select * into v_request from public.group_join_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status != 'pending' then raise exception 'Request already reviewed'; end if;

  -- verify caller is admin
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

-- Reject join request RPC
create or replace function public.reject_join_request(p_request_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_request group_join_requests%rowtype;
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
```

### App Files
| File | Action |
|------|--------|
| `app/(tabs)/index.tsx` | Change Join button to open Discover screen |
| `app/discover/index.tsx` | NEW — radius picker, nearby groups list |
| `app/group/new/index.tsx` | Add "Make discoverable" toggle + capture device location |
| `app/group/[id]/join-requests.tsx` | NEW — admin approve/reject UI |
| `app/group/[id]/index.tsx` | Add join requests badge for admins |
| `hooks/useDiscover.ts` | NEW — useNearbyGroups, useRequestJoin |
| `hooks/useGroup.ts` | Add useJoinRequests, useApproveRequest, useRejectRequest |
| `types/index.ts` | Add GroupJoinRequest, NearbyGroup types |

---

## Feature 3: Solo Trip Planning

### Problem
A user with no group has no way to plan a personal trip. All trip screens live inside `group/[id]/trip/...`.

### Solution — Auto Solo Group
On first use or when the user taps "Plan Solo Trip", call `ensureSoloGroup()` which:
1. Checks Supabase for an existing group with `is_solo = true` where the user is the only member.
2. If none exists, creates one silently (name: "[FirstName]'s Solo Trips", is_solo: true, is_discoverable: false).
3. Returns the group ID and navigates the user to the standard group trip creation flow.

Solo groups are invisible in the normal groups list (filtered by `is_solo = false`) but the trip/budget/expense/chat screens work identically.

### DB Migration (migration_006_solo.sql)
```sql
alter table public.groups add column if not exists is_solo boolean not null default false;

-- Solo groups are readable only by their sole member
-- (the existing groups_read policy via is_group_member already handles this)

-- Hide solo groups from standard group listing — enforced in app query
```

### App Changes
| File | Action |
|------|--------|
| `lib/solo.ts` | NEW — ensureSoloGroup(userId, userName) helper |
| `hooks/useGroup.ts` | Filter `is_solo = false` from useGroups(); add useSoloGroup() |
| `app/(tabs)/index.tsx` | Add "Plan Solo Trip" button in empty state + secondary FAB |
| `app/group/new/index.tsx` | No change — solo group is created silently, not via this screen |

---

## Implementation Order

1. DB migrations (run in Supabase SQL editor)
2. Feature 1: Budget mark-as-paid (types → hook → budget screen)
3. Feature 3: Solo trip (lib/solo.ts → useGroup filter → home screen UI)
4. Feature 2: Discover (types → hooks → screens → group creation update)
5. Schema.sql update with all migration SQL appended
6. ARCHITECTURE.md build phases update
