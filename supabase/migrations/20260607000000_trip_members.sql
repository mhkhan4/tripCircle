-- Trip members: opt-in membership for trips within a group
-- Creator is auto-joined in app code; other group members see a Join CTA

create table if not exists public.trip_members (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references public.trips on delete cascade not null,
  user_id     uuid references public.users on delete cascade not null,
  joined_at   timestamptz default now(),
  unique (trip_id, user_id)
);

alter table public.trip_members enable row level security;

-- Helper: is the caller a member of this trip?
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  )
$$;

-- Any group member of the trip's group can read the member list (to render Join UI)
create policy "tm_read" on public.trip_members for select using (
  exists (
    select 1 from public.trips t
    join public.group_members gm on gm.group_id = t.group_id
    where t.id = trip_id and gm.user_id = auth.uid()
  )
);

-- Group members can only self-join (user_id must equal caller)
create policy "tm_insert" on public.trip_members for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.trips t
    join public.group_members gm on gm.group_id = t.group_id
    where t.id = trip_id and gm.user_id = auth.uid()
  )
);

-- Members can leave themselves; trip creator can remove anyone
create policy "tm_delete" on public.trip_members for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.trips
    where id = trip_id and created_by = auth.uid()
  )
);

-- Recalculate per-person budget total when trip membership changes
create or replace function public.recalculate_trip_budget_for_trip()
returns trigger language plpgsql as $$
declare
  v_trip_id uuid;
  v_member_count int;
begin
  v_trip_id := coalesce(NEW.trip_id, OLD.trip_id);
  select count(*) into v_member_count
  from public.trip_members where trip_id = v_trip_id;

  update public.budgets
  set total_amount = per_person_amount * v_member_count
  where trip_id = v_trip_id and per_person_amount is not null;
  return null;
end;
$$;

create trigger trg_recalculate_trip_budget
after insert or delete on public.trip_members
for each row execute function recalculate_trip_budget_for_trip();
