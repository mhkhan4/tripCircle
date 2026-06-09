# TripOrbit — Group Members Management: Architecture Plan

## Codebase Findings Summary

**Role model already exists.** `group_members.role` is already a `text` column with `check (role in ('admin', 'member'))`. The group creator is always inserted as `'admin'` in `useCreateGroup`. No schema column needs to be added.

**"Creator" is defined by role, not `groups.created_by`.** The `groups_update` RLS policy checks `role = 'admin'`, not `created_by`. The design follows this existing convention — admin = creator with elevated rights. A group can theoretically have multiple admins in the future, which is the right flexibility.

**The `gm_insert` policy is wide open.** Currently `gm_insert` uses `with check (true)`, meaning any authenticated user can insert any `group_members` row. This is a critical security gap that the new feature must fix.

**`gm_delete` does not exist.** There is currently no `DELETE` policy on `group_members` at all, meaning deletion will fail silently or return an RLS error. This must be added.

**No `username` column exists.** The `users` table has `full_name` and `email`. Search will work against both. An optional `username` column can be added as a net-new field.

**No existing modal/bottom-sheet pattern.** There is no `components/` folder yet. The modal will use a standard `Modal` stack screen via Expo Router.

**TanStack Query is the data layer.** All hooks follow a consistent pattern: `useQuery` for reads, `useMutation` with `queryClient.invalidateQueries` for writes.

---

## 1. Database Changes

### 1a. Add `username` column to `users`

```sql
ALTER TABLE public.users
  ADD COLUMN username text unique;
```

The `handle_new_user` trigger does not need to be changed — `username` is nullable and set later by the user in their profile screen.

### 1b. Fix the `gm_insert` RLS policy

The current open policy must be replaced with one that only allows a current group member to add another user:

```sql
DROP POLICY "gm_insert" ON public.group_members;

CREATE POLICY "gm_insert" ON public.group_members
  FOR INSERT WITH CHECK (
    is_group_member(group_id)
    AND role = 'member'
  );
```

This enforces two things: (1) the inserter must already be a member, and (2) the inserted row's role can only be `'member'` — preventing any member from granting admin to themselves or others by crafting an INSERT.

### 1c. Add `gm_delete` RLS policy

Only the group admin can remove members, and admins cannot remove themselves (to prevent an ownerless group):

```sql
CREATE POLICY "gm_delete" ON public.group_members
  FOR DELETE USING (
    exists (
      select 1 from public.group_members
      where group_id = group_members.group_id
        and user_id = auth.uid()
        and role = 'admin'
    )
    AND user_id <> auth.uid()
  );
```

### 1d. New Supabase RPC: `add_member_to_group`

A security-definer RPC atomically validates that the target user exists, is not already a member, and the caller is a member of the group:

```sql
CREATE OR REPLACE FUNCTION public.add_member_to_group(
  p_group_id uuid,
  p_target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (p_group_id, p_target_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;
```

### 1e. Trigram indexes for search performance

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX users_full_name_trgm ON public.users USING GIN (full_name gin_trgm_ops);
CREATE INDEX users_username_trgm ON public.users USING GIN (username gin_trgm_ops);
```

### Migration file location

`supabase/migrations/001_group_members_management.sql`

---

## 2. TypeScript Type Changes

**File:** `types/index.ts`

- Add `username: string | null` to `UserProfile`
- Add `GroupMemberWithProfile` type where `user` is non-optional (always present from the join)

---

## 3. UI Architecture

### 3a. Entry Point — Members button on Group Dashboard

**File to modify:** `app/group/[id]/index.tsx`

Add a "Members" button to the existing action row (Invite, Chat). Tapping it navigates to `members.tsx`.

```tsx
<TouchableOpacity
  onPress={() => router.push(`/group/${id}/members`)}
  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 py-2"
>
  <Ionicons name="people-outline" size={16} color="#64748B" />
  <Text className="text-sm font-semibold text-gray-600">Members</Text>
</TouchableOpacity>
```

### 3b. Members Screen

**File:** `app/group/[id]/members.tsx`

Full stack screen (not a modal), consistent with how `chat.tsx` works. Registered automatically by Expo Router's file-based routing.

- Header right: `+` icon (shown to all members, opens the Add Member modal)
- `FlatList` of `MemberRow` components
- Each row: avatar circle with initial, `full_name`, `username` if set, role badge (`Admin` tag for admins)
- Admin-only: overflow menu or swipe-to-reveal "Remove" action on each row (never shown on the current user's own row)
- Confirmation `Alert.alert` before calling the remove mutation

### 3c. Add Member Modal

**File:** `app/group/[id]/add-member.tsx`

Presented as `presentation: 'modal'` via Expo Router stack. `groupId` passed via `useLocalSearchParams`.

- `TextInput` at top: "Search by name or username" with 300ms debounce
- `FlatList` of `UserSearchRow` components
- Users already in the group appear grayed out with "Already a member" badge
- Tapping "Add" fires the mutation inline — user can add multiple people without closing the modal
- Empty state (no query): "Type a name or @username to search"
- Empty state (no results): "No TripOrbit users found"

### 3d. `MemberRow` Component

**File:** `components/MemberRow.tsx`

Props:
- `member: GroupMemberWithProfile`
- `isCurrentUser: boolean`
- `currentUserIsAdmin: boolean`
- `onRemove?: (membershipId: string) => void`

### 3e. `UserSearchRow` Component

**File:** `components/UserSearchRow.tsx`

Props:
- `user: UserProfile`
- `alreadyMember: boolean`
- `onAdd: (userId: string) => void`
- `isLoading: boolean` (spinner in place of Add button while mutation runs)

---

## 4. API Layer — new hooks in `hooks/useGroup.ts`

### `useGroupMembers(groupId: string)`

```
queryKey: ['group-members', groupId]
queryFn: supabase
  .from('group_members')
  .select('*, user:users(*)')
  .eq('group_id', groupId)
  .order('joined_at', { ascending: true })
```

### `useSearchUsers(query: string, groupId: string)`

```
queryKey: ['user-search', query, groupId]
enabled: query.trim().length >= 2
queryFn: supabase
  .from('users')
  .select('*')
  .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
  .neq('id', currentUser.id)
  .limit(20)
```

`alreadyMember` is computed client-side from the cached `useGroupMembers` data — no extra DB roundtrip.

Guest mode: return `[]`.

### `useAddMember(groupId: string)`

```
mutationFn: supabase.rpc('add_member_to_group', {
  p_group_id: groupId,
  p_target_user_id: targetUserId
})
onSuccess: invalidate ['group-members', groupId], ['group', groupId]
```

### `useRemoveMember(groupId: string)`

```
mutationFn: supabase
  .from('group_members')
  .delete()
  .eq('id', membershipRowId)   -- use the group_members PK, not user_id
onSuccess: invalidate ['group-members', groupId], ['group', groupId]
```

---

## 5. Permission Model

### Source of truth

`group_members.role` — values: `'admin'` or `'member'`. Group creator is always inserted as `'admin'`.

### Client-side check (UX only)

```ts
const currentMembership = members?.find(m => m.user_id === user?.id)
const isAdmin = currentMembership?.role === 'admin'
```

`isAdmin` gates the Remove button in the UI. The DB enforces all rules regardless of what the client sends.

### Database enforcement summary

| Operation | Who can do it | Enforced by |
|---|---|---|
| SELECT group_members | Any group member | `gm_read` policy via `is_group_member()` |
| INSERT group_members | Any group member, role forced to 'member' | New `gm_insert` policy |
| DELETE group_members | Admin only, cannot delete self | New `gm_delete` policy |
| Add via RPC | Any group member | `add_member_to_group` SECURITY DEFINER |

---

## 6. Search Flow (Step by Step)

1. User taps `+` on `members.tsx` → navigates to `add-member.tsx` modal
2. `useGroupMembers(groupId)` is already warm in TanStack Query cache
3. User types in search input → 300ms debounce → `query` state updates
4. `useSearchUsers` fires when `query.length >= 2` — `ilike` on `full_name` and `username`
5. Results render as `UserSearchRow` components; `alreadyMember` computed from cached member list
6. User taps "Add" → `useAddMember` mutation fires the RPC
7. On success, `['group-members', groupId]` is invalidated — row updates to "Already a member"
8. User can continue searching and adding without closing the modal
9. User dismisses modal → `members.tsx` shows the updated list

---

## 7. Navigation Integration

### `app/group/_layout.tsx` — register modal screen

```tsx
<Stack.Screen
  name="[id]/add-member"
  options={{ presentation: 'modal', title: 'Add Member', headerShown: true }}
/>
```

---

## 8. Complete File Inventory

### New files

| File | Purpose |
|---|---|
| `app/group/[id]/members.tsx` | Member list screen |
| `app/group/[id]/add-member.tsx` | User search + add modal |
| `components/MemberRow.tsx` | Reusable member list row |
| `components/UserSearchRow.tsx` | Reusable search result row |
| `supabase/migrations/001_group_members_management.sql` | DB migration: username column, fixed RLS, delete policy, RPC, indexes |

### Files to modify

| File | What changes |
|---|---|
| `hooks/useGroup.ts` | Add `useGroupMembers`, `useSearchUsers`, `useAddMember`, `useRemoveMember` |
| `types/index.ts` | Add `username` to `UserProfile`, add `GroupMemberWithProfile` |
| `app/group/[id]/index.tsx` | Add Members button to the header action row |
| `app/group/_layout.tsx` | Register `add-member` screen with `presentation: 'modal'` |

---

## 10. Known Risks and Mitigations

**`gm_insert` change breaks existing invite link join flow.**
The `join_group_by_invite_code` RPC uses `SECURITY DEFINER` and bypasses RLS entirely — unaffected. The old `useJoinGroup` hook that did a direct INSERT should be reviewed and removed or updated to use the RPC (superseded by the recent `c0e58dd` commit).

**Search performance on large user base.**
`ilike` with leading wildcard is a sequential scan. The trigram indexes in the migration resolve this.

**Admin accidentally removes themselves.**
Blocked at the DB level by `user_id <> auth.uid()` in `gm_delete`. The UI additionally never renders a remove button on the current user's own row.

**Last admin removed, leaving an ownerless group.**
The current `gm_delete` policy prevents an admin from removing themselves but not from removing another admin. With a single-admin model this is not a problem now. Future hardening: count admins in the delete policy or use a separate RPC.
