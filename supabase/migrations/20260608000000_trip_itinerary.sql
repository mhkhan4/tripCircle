-- Trip itinerary entries

create table if not exists public.trip_itinerary (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid references public.trips on delete cascade not null,
  created_by          uuid references public.users on delete cascade not null,
  entry_type          text not null check (entry_type in ('flight', 'hotel', 'activity', 'restaurant', 'transport', 'other')),
  title               text not null,
  starts_at           timestamptz,
  ends_at             timestamptz,
  confirmation_number text,
  link                text,
  notes               text,
  created_at          timestamptz default now()
);

alter table public.trip_itinerary enable row level security;

create policy "itinerary_read" on public.trip_itinerary for select using (
  public.is_trip_member(trip_id)
);

create policy "itinerary_insert" on public.trip_itinerary for insert with check (
  created_by = auth.uid()
  and public.is_trip_member(trip_id)
);

create policy "itinerary_delete" on public.trip_itinerary for delete using (
  created_by = auth.uid()
);
