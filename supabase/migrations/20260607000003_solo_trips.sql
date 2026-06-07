-- Solo groups: personal trip planning without a travel group
alter table public.groups add column if not exists is_solo boolean not null default false;
