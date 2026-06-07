-- Run this in your Supabase SQL editor to set up the database

-- Users (mirrors Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  phone text unique,
  first_name text,
  last_name text,
  full_name text,
  username text unique,
  avatar_url text,
  provider text default 'email',
  created_at timestamptz default now()
);

-- Auto-create user profile on sign up (handles Google OAuth and phone auth)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, phone, first_name, last_name, full_name, avatar_url, provider)
  values (
    new.id,
    new.email,
    new.phone,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  avatar_url text,
  invite_code text unique not null,
  created_by uuid references public.users not null,
  created_at timestamptz default now()
);

-- Group Members
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade not null,
  title text not null,
  destination text not null,
  description text,
  start_date date not null,
  end_date date not null,
  status text not null default 'planning' check (status in ('planning', 'confirmed', 'ongoing', 'completed')),
  cover_image text,
  created_by uuid references public.users not null,
  created_at timestamptz default now()
);

-- Budgets (one per trip)
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null unique,
  total_amount numeric not null check (total_amount > 0),
  currency text not null default 'USD',
  created_by uuid references public.users not null,
  created_at timestamptz default now()
);

-- Budget Contributions
create table public.budget_contributions (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  pledged_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  paid_at timestamptz,
  unique (budget_id, user_id)
);

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'USD',
  category text not null default 'other' check (category in ('food', 'transport', 'accommodation', 'activities', 'shopping', 'other')),
  description text not null,
  paid_by uuid references public.users not null,
  receipt_url text,
  ocr_raw jsonb,
  created_at timestamptz default now()
);

-- Expense Splits
create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  share_amount numeric not null,
  is_settled boolean not null default false,
  settled_at timestamptz
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade not null,
  trip_id uuid references public.trips on delete cascade,
  sender_id uuid references public.users on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- =====================
-- Row Level Security
-- =====================

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.trips enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_contributions enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.messages enable row level security;

-- Users: anyone can read, only self can update
create policy "users_read" on public.users for select using (true);
create policy "users_update" on public.users for update using (auth.uid() = id);

-- Group members helper
create or replace function public.is_group_member(gid uuid)
returns boolean as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$ language sql security definer;

-- Groups: members can read, admins can update
create policy "groups_read" on public.groups for select using (is_group_member(id));
create policy "groups_insert" on public.groups for insert with check (auth.uid() = created_by);
create policy "groups_update" on public.groups for update using (
  exists (select 1 from public.group_members where group_id = id and user_id = auth.uid() and role = 'admin')
);

-- Group members
create policy "gm_read" on public.group_members for select using (is_group_member(group_id));
create policy "gm_insert" on public.group_members for insert with check (true);

-- Trips
create policy "trips_read" on public.trips for select using (is_group_member(group_id));
create policy "trips_insert" on public.trips for insert with check (is_group_member(group_id) and auth.uid() = created_by);
create policy "trips_update" on public.trips for update using (is_group_member(group_id));

-- Budgets
create policy "budgets_read" on public.budgets for select using (
  exists (select 1 from public.trips where id = trip_id and is_group_member(group_id))
);
create policy "budgets_insert" on public.budgets for insert with check (auth.uid() = created_by);

-- Budget contributions
create policy "bc_read" on public.budget_contributions for select using (true);
create policy "bc_insert" on public.budget_contributions for insert with check (true);
create policy "bc_update" on public.budget_contributions for update using (auth.uid() = user_id);

-- Expenses
create policy "expenses_read" on public.expenses for select using (
  exists (select 1 from public.trips where id = trip_id and is_group_member(group_id))
);
create policy "expenses_insert" on public.expenses for insert with check (auth.uid() = paid_by);

-- Expense splits
create policy "splits_read" on public.expense_splits for select using (true);
create policy "splits_insert" on public.expense_splits for insert with check (true);
create policy "splits_update" on public.expense_splits for update using (auth.uid() = user_id);

-- Messages
create policy "messages_read" on public.messages for select using (is_group_member(group_id));
create policy "messages_insert" on public.messages for insert with check (is_group_member(group_id) and auth.uid() = sender_id);

-- Realtime: enable for messages table
alter publication supabase_realtime add table public.messages;

-- Invite join RPC: bypasses RLS so an authenticated non-member can join via invite code
-- Returns the group_id on success, raises on invalid code or unauthenticated
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

-- Storage: create receipts bucket (run in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true);

-- =====================
-- Budget payment admin
-- =====================

-- Allow group admins to update contributions on behalf of members
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

-- =====================
-- Discover nearby groups
-- =====================

alter table public.groups add column if not exists latitude float8;
alter table public.groups add column if not exists longitude float8;
alter table public.groups add column if not exists is_discoverable boolean not null default false;
alter table public.groups add column if not exists is_solo boolean not null default false;

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
