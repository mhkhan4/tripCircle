-- Phone authentication support: update users table + handle_new_user trigger
-- Also ensures Phase 10 group columns exist (idempotent via IF NOT EXISTS)

-- 1. Make email nullable (phone users have no email)
alter table public.users alter column email drop not null;

-- 2. Add phone/first_name/last_name columns
alter table public.users add column if not exists phone text unique;
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name text;

-- 3. Update trigger to handle both Google (email) and phone auth
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
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. Phase 10 group columns (idempotent — safe to run even if already applied)
alter table public.groups add column if not exists latitude float8;
alter table public.groups add column if not exists longitude float8;
alter table public.groups add column if not exists is_discoverable boolean not null default false;
alter table public.groups add column if not exists is_solo boolean not null default false;
