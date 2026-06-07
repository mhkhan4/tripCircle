-- Phone auth support: make email nullable, add phone + first/last name columns
-- Also ensures Phase 10 group columns exist (idempotent via IF NOT EXISTS)

-- 1. Make email nullable (phone users won't have email)
alter table public.users alter column email drop not null;
alter table public.users alter column email drop default;

-- 2. Add phone, first_name, last_name columns
alter table public.users add column if not exists phone text unique;
alter table public.users add column if not exists first_name text not null default '';
alter table public.users add column if not exists last_name text not null default '';

-- 3. Rebuild handle_new_user to handle both OAuth and phone sign-ups
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_email      text;
  v_phone      text;
  v_first_name text;
  v_last_name  text;
  v_full_name  text;
  v_avatar_url text;
  v_provider   text;
begin
  v_email    := new.email;
  v_phone    := new.phone;
  v_provider := coalesce(new.raw_app_meta_data->>'provider', 'email');

  v_first_name := coalesce(
    new.raw_user_meta_data->>'first_name',
    split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1),
    ''
  );
  v_last_name := coalesce(
    new.raw_user_meta_data->>'last_name',
    nullif(substring(
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
      from position(' ' in coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')) + 1
    ), ''),
    ''
  );
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    trim(v_first_name || ' ' || v_last_name),
    ''
  );
  v_avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.users (id, email, phone, first_name, last_name, full_name, avatar_url, provider)
  values (new.id, v_email, v_phone, v_first_name, v_last_name, v_full_name, v_avatar_url, v_provider)
  on conflict (id) do update set
    email      = coalesce(excluded.email,      public.users.email),
    phone      = coalesce(excluded.phone,      public.users.phone),
    first_name = case when excluded.first_name != '' then excluded.first_name else public.users.first_name end,
    last_name  = case when excluded.last_name  != '' then excluded.last_name  else public.users.last_name  end,
    full_name  = case when excluded.full_name  != '' then excluded.full_name  else public.users.full_name  end,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
end;
$$;

-- 4. Phase 10 group columns (idempotent — safe to run even if already applied)
alter table public.groups add column if not exists latitude float8;
alter table public.groups add column if not exists longitude float8;
alter table public.groups add column if not exists is_discoverable boolean not null default false;
alter table public.groups add column if not exists is_solo boolean not null default false;
