-- Add per_person_amount to budgets so the total can auto-scale with member count
alter table public.budgets
  add column if not exists per_person_amount numeric check (per_person_amount > 0);

-- Function: when group members change, recalculate total for any per-person budgets in that group
create or replace function update_per_person_budgets()
returns trigger language plpgsql security definer as $$
declare
  v_group_id uuid;
  v_member_count integer;
begin
  v_group_id := coalesce(NEW.group_id, OLD.group_id);

  select count(*) into v_member_count
  from public.group_members
  where group_id = v_group_id;

  update public.budgets b
  set total_amount = b.per_person_amount * v_member_count
  from public.trips t
  where t.id = b.trip_id
    and t.group_id = v_group_id
    and b.per_person_amount is not null
    and v_member_count > 0;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_update_per_person_budgets on public.group_members;
create trigger trg_update_per_person_budgets
after insert or delete on public.group_members
for each row execute function update_per_person_budgets();
