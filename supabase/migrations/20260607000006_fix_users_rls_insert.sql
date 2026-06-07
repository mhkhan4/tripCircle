-- Allow authenticated users to insert their own profile row.
-- This covers the case where an account was created before the handle_new_user
-- trigger existed (e.g. phone-auth users before the users table was set up).
-- The existing update policy already limits changes to the owner's own row.
create policy "users_insert" on public.users
  for insert with check (auth.uid() = id);
