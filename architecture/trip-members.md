# TripOrbit — Trip Members: Architecture Plan

## Decision

**Option 2 — trips live inside the group, group members opt in.**

When a trip is created inside a group:
- The creator is automatically joined.
- All other group members see the trip with a "Join" CTA — they are not auto-enrolled.
- Any joined member can leave. The trip creator can remove any member.
- Expense splits are calculated against `trip_members`, not `group_members`.

---

## 1. Database Changes

### 1a. New `trip_members` table

```sql
create table public.trip_members (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references public.trips on delete cascade not null,
  user_id     uuid references public.users on delete cascade not null,
  role        text not null default 'member' check (role in ('admin', 'member')),
  joined_at   timestamptz default now(),
  unique (trip_id, user_id)
);
```

The trip creator is auto-inserted with `role = 'admin'`. Any admin can promote or demote other members (not the trip creator).

### 1b-i. `is_trip_admin` helper

```sql
create or replace function public.is_trip_admin(p_trip_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role = 'admin'
  )
  or exists (
    select 1 from public.trips
    where id = p_trip_id and created_by = auth.uid()
  )
$$;
```

### 1b. Helper function: `is_trip_member`

```sql
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  )
$$;
```

### 1c. RLS for `trip_members`

```sql
alter table public.trip_members enable row level security;

-- Any group member can see who joined (renders Join/Leave UI)
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

-- Leave yourself, or trip creator removes anyone
create policy "tm_delete" on public.trip_members for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.trips
    where id = trip_id and created_by = auth.uid()
  )
);
```

### 1d. Auto-join creator via app code (not a trigger)

`useCreateTrip` mutation inserts the trip and immediately inserts the creator row into `trip_members` with `role = 'admin'` in a sequential call. No DB trigger needed — avoids hidden side-effects.

### 1e. Budget per-person trigger update

The existing `recalculate_trip_budgets` trigger on `group_members` must be replicated for `trip_members`. A new trigger fires on `INSERT` or `DELETE` on `trip_members` and recalculates `total_amount = per_person_amount × trip_member_count` for the affected trip's budget.

```sql
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
```

### Migration file

`supabase/migrations/20260607000000_trip_members.sql`

---

## 2. TypeScript Type Changes

**File:** `types/index.ts`

```ts
export type TripMember = {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
};

export type TripMemberWithProfile = TripMember & {
  user: UserProfile;
};
```

---

## 3. Hook Changes

### `useTrip.ts` — new hooks

#### `useTripMembers(tripId: string)`
```
queryKey: ['trip-members', tripId]
queryFn: supabase
  .from('trip_members')
  .select('*, user:users(*)')
  .eq('trip_id', tripId)
  .order('joined_at', { ascending: true })
Guest mode: return [guestTripMember]
```

#### `useJoinTrip()`
```
mutationFn: supabase
  .from('trip_members')
  .insert({ trip_id, user_id: user.id })
onSuccess: invalidate ['trip-members', tripId], ['trips', groupId]
```

#### `useLeaveTrip()`
```
mutationFn: supabase
  .from('trip_members')
  .delete()
  .eq('trip_id', tripId)
  .eq('user_id', user.id)
onSuccess: invalidate ['trip-members', tripId], ['trips', groupId]
```

#### `useRemoveTripMember()`
```
mutationFn: supabase
  .from('trip_members')
  .delete()
  .eq('id', membershipRowId)
onSuccess: invalidate ['trip-members', tripId]
```

#### `useUpdateTripMemberRole()`
```
mutationFn: supabase
  .from('trip_members')
  .update({ role })
  .eq('id', membershipId)
onSuccess: invalidate ['trip-members', tripId]
```
Only succeeds if the caller is a trip admin (enforced by `tm_update_role` RLS policy). Cannot change role of the trip creator.

### `useCreateTrip` — auto-join creator as admin

After the trip INSERT succeeds, immediately insert the creator into `trip_members` with `role = 'admin'`:

```ts
onSuccess: async (trip) => {
  await supabase.from('trip_members').insert({ trip_id: trip.id, user_id: user!.id, role: 'admin' });
  queryClient.invalidateQueries({ queryKey: ['trips', trip.group_id] });
  queryClient.invalidateQueries({ queryKey: ['all-trips'] });
}
```

### `useBudget.ts` — expense splits use trip members

`useAddExpense` currently receives `splits` computed from `group?.group_members` in `add-expense.tsx`. Change the caller to use `useTripMembers(tripId)` instead.

---

## 4. UI Changes

### 4a. Group dashboard trip card (`app/group/[id]/index.tsx`)

Each trip card shows a "Join" button when the current user is not a `trip_member`. Requires fetching `trip_members` for each visible trip (use `useTripMembers` per card, TanStack Query deduplicates).

- User is a member → "View" (existing tap behavior)
- User is not a member → "View" tap is still allowed (they can see the trip) + a distinct "Join" button
- OR: disable tap-to-enter for non-members, only show Join. Decision: allow viewing, but expense/budget actions are gated.

**Recommended approach:** Show trip card normally. Add a "Join" badge/button on non-member trips. Trip detail screen checks membership and hides expense-add if not a member.

### 4b. Trip detail screen (`app/group/[id]/trip/[tripId]/index.tsx`)

Add a "Members" section at the bottom:
- List of `TripMemberRow` components (avatar + name)
- "Leave Trip" button for any member who is not the creator
- Creator sees "Remove" on each other member's row (long-press or swipe)
- Non-members see a prominent "Join Trip" CTA instead of the member list

### 4c. New component: `components/TripMemberRow.tsx`

Props:
- `member: TripMemberWithProfile`
- `isCurrentUser: boolean`
- `currentUserIsAdmin: boolean` — whether the viewing user is an admin
- `isCreator: boolean` — whether this row's member is the trip creator (shield/remove buttons hidden for creator)
- `onRemove?: (membershipId: string) => void`
- `onToggleAdmin?: (membershipId: string, currentRole: 'admin' | 'member') => void`

Shows an "Admin" badge on members with `role = 'admin'`. If `currentUserIsAdmin` and the row is not the creator, shows a shield icon to promote/demote and a remove button.

---

## 5. Permission Model

| Operation | Who can | Enforced by |
|---|---|---|
| SELECT trip_members | Any group member | `tm_read` RLS policy |
| INSERT trip_members | Group member, self only | `tm_insert` RLS policy |
| UPDATE trip_members role | Trip admin (not self, not creator) | `tm_update_role` RLS policy |
| DELETE trip_members (leave) | The member themselves | `tm_delete` — `user_id = auth.uid()` |
| DELETE trip_members (kick) | Trip creator or trip admin | `tm_delete` |
| DELETE poll / task / itinerary | Item creator OR trip admin | `polls_delete` / `tasks_delete` / `itinerary_delete` RLS policies |

---

## 6. Known Constraints

**Trip creator cannot leave.** The `tm_delete` policy allows self-delete, but the UI should block the creator from leaving (show "Delete Trip" instead). Future: allow creator transfer.

**Trip creator's admin status is permanent.** The `tm_update_role` policy blocks callers from updating their own row (`user_id <> auth.uid()`), and the UI hides the shield button on the creator row (`isCreator` prop). Even another admin cannot demote the trip creator.

**Expense splits on old trips.** Trips created before this migration have no `trip_members` rows. The `add-expense.tsx` fallback should use `group_members` when `trip_members` is empty for backward compat.

**Budget trigger scope.** The existing trigger on `group_members` recalculated budgets for all trips in a group. The new trigger on `trip_members` recalculates only the specific trip's budget — this is the correct behavior going forward.

---

## 7. Complete File Inventory

### New files

| File | Purpose |
|---|---|
| `supabase/migrations/20260607000000_trip_members.sql` | DB migration: trip_members table, RLS, trigger |
| `supabase/migrations/20260608000001_trip_member_roles.sql` | DB migration: role column, is_trip_admin helper, updated delete policies |
| `architecture/trip-members.md` | This document |
| `components/TripMemberRow.tsx` | Reusable trip member row with admin badge + promote/demote |

### Files to modify

| File | What changes |
|---|---|
| `types/index.ts` | Add `TripMember`, `TripMemberWithProfile`; add `role` field |
| `hooks/useTrip.ts` | Add `useTripMembers`, `useJoinTrip`, `useLeaveTrip`, `useRemoveTripMember`, `useUpdateTripMemberRole`; update `useCreateTrip` to auto-join creator as admin |
| `app/group/[id]/index.tsx` | Show "Join" CTA on trip cards for non-members |
| `app/group/[id]/trip/[tripId]/index.tsx` | Members section with promote/demote, Leave/Join CTA |
| `app/group/[id]/trip/[tripId]/polls.tsx` | Delete button visible to creator OR trip admin |
| `app/group/[id]/trip/[tripId]/tasks.tsx` | Delete button visible to creator OR trip admin |
| `app/group/[id]/trip/[tripId]/itinerary.tsx` | Delete button visible to creator OR trip admin |
| `app/trip/[tripId]/tasks.tsx` | Delete button hidden from non-creator (solo trips) |
| `app/trip/[tripId]/itinerary.tsx` | Delete button hidden from non-creator (solo trips) |
| `app/group/[id]/trip/[tripId]/add-expense.tsx` | Compute splits from trip members, not group members |
| `ARCHITECTURE.md` | Update schema table and build phases |

---

## 8. Build Phase

Phase 9 — Trip Membership. Phase 12 added `role` column, admin delegation, and admin-level delete permissions.
