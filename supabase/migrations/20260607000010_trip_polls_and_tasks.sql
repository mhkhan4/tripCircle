-- Trip polls, poll options, poll votes, and trip tasks

-- ── Polls ──────────────────────────────────────────────────────────────────

create table if not exists public.trip_polls (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid references public.trips on delete cascade not null,
  created_by        uuid references public.users on delete cascade not null,
  question          text not null,
  poll_type         text not null check (poll_type in ('destination', 'date', 'activity', 'custom')),
  closes_at         timestamptz not null,
  resolved_option_id uuid,
  created_at        timestamptz default now()
);

create table if not exists public.trip_poll_options (
  id       uuid primary key default gen_random_uuid(),
  poll_id  uuid references public.trip_polls on delete cascade not null,
  label    text not null
);

create table if not exists public.trip_poll_votes (
  id        uuid primary key default gen_random_uuid(),
  poll_id   uuid references public.trip_polls on delete cascade not null,
  option_id uuid references public.trip_poll_options on delete cascade not null,
  user_id   uuid references public.users on delete cascade not null,
  unique (poll_id, user_id)
);

alter table public.trip_polls enable row level security;
alter table public.trip_poll_options enable row level security;
alter table public.trip_poll_votes enable row level security;

-- Polls: trip members can read; trip members can create; creator can delete
create policy "polls_read" on public.trip_polls for select using (
  public.is_trip_member(trip_id)
);

create policy "polls_insert" on public.trip_polls for insert with check (
  created_by = auth.uid()
  and public.is_trip_member(trip_id)
);

create policy "polls_delete" on public.trip_polls for delete using (
  created_by = auth.uid()
);

-- Poll options: readable by trip members; insertable by poll creator
create policy "poll_options_read" on public.trip_poll_options for select using (
  exists (
    select 1 from public.trip_polls p
    where p.id = poll_id and public.is_trip_member(p.trip_id)
  )
);

create policy "poll_options_insert" on public.trip_poll_options for insert with check (
  exists (
    select 1 from public.trip_polls p
    where p.id = poll_id and p.created_by = auth.uid()
  )
);

-- Poll votes: trip members can read votes; members can upsert their own vote
create policy "poll_votes_read" on public.trip_poll_votes for select using (
  exists (
    select 1 from public.trip_polls p
    where p.id = poll_id and public.is_trip_member(p.trip_id)
  )
);

create policy "poll_votes_insert" on public.trip_poll_votes for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.trip_polls p
    where p.id = poll_id and public.is_trip_member(p.trip_id)
  )
);

create policy "poll_votes_update" on public.trip_poll_votes for update using (
  user_id = auth.uid()
);

-- ── Tasks ──────────────────────────────────────────────────────────────────

create table if not exists public.trip_tasks (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references public.trips on delete cascade not null,
  created_by   uuid references public.users on delete cascade not null,
  title        text not null,
  category     text not null check (category in ('flights', 'hotel', 'activities', 'transport', 'packing', 'other')),
  assigned_to  uuid references public.users on delete set null,
  due_date     date,
  completed_at timestamptz,
  completed_by uuid references public.users on delete set null,
  created_at   timestamptz default now()
);

alter table public.trip_tasks enable row level security;

-- Tasks: trip members can read; trip members can create; creator can delete
create policy "tasks_read" on public.trip_tasks for select using (
  public.is_trip_member(trip_id)
);

create policy "tasks_insert" on public.trip_tasks for insert with check (
  created_by = auth.uid()
  and public.is_trip_member(trip_id)
);

create policy "tasks_update" on public.trip_tasks for update using (
  public.is_trip_member(trip_id)
);

create policy "tasks_delete" on public.trip_tasks for delete using (
  created_by = auth.uid()
);
