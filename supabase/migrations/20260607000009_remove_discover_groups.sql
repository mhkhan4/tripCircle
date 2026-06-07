-- Remove group discoverability feature: groups are now invite-only

-- Drop RPC functions
drop function if exists find_nearby_groups(float8, float8, float8);
drop function if exists approve_join_request(uuid);
drop function if exists reject_join_request(uuid);

-- Drop join requests table (RLS policies drop with it)
drop table if exists group_join_requests;

-- Drop discovery columns from groups
alter table groups
  drop column if exists is_discoverable,
  drop column if exists latitude,
  drop column if exists longitude;
