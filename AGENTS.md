# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Known Issues & Patterns

## Alert.alert silently fails on this platform

`Alert.alert` from React Native does nothing when the app runs on web (Expo web / browser context). Tapping a button that calls `Alert.alert` appears completely broken — no dialog, no error, no console output.

**Rule:** Never use `Alert.alert` for confirmation dialogs. Always use an inline `Modal` with Cancel/Confirm buttons.

**Established pattern** — store the pending item ID in state, clear it on cancel or after confirming:

```tsx
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

function handleDelete(item: Item) {
  setConfirmDeleteId(item.id);
}

async function confirmDelete() {
  const item = items?.find((i) => i.id === confirmDeleteId);
  if (!item) return;
  setConfirmDeleteId(null);
  try {
    await deleteMutation.mutateAsync({ id: item.id });
  } catch (e: any) {
    Alert.alert('Error', e.message); // error alerts are fine — user-initiated delete already happened
  }
}

// In JSX:
<Modal visible={!!confirmDeleteId} animationType="fade" transparent>
  <View className="flex-1 items-center justify-center bg-black/50 px-6">
    <View className="w-full rounded-2xl bg-white p-6 dark:bg-gray-900">
      <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Delete?</Text>
      <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">This cannot be undone.</Text>
      <View className="flex-row gap-3">
        <TouchableOpacity onPress={() => setConfirmDeleteId(null)} className="flex-1 rounded-xl border border-gray-200 py-3 items-center dark:border-gray-700">
          <Text className="font-semibold text-gray-700 dark:text-gray-300">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete} disabled={deleteMutation.isPending} className="flex-1 rounded-xl bg-red-500 py-3 items-center">
          {deleteMutation.isPending ? <ActivityIndicator color="white" size="small" /> : <Text className="font-bold text-white">Delete</Text>}
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

This pattern is already applied in: `polls.tsx`, `itinerary.tsx`, `tasks.tsx` (both group-trip and solo-trip variants).

---

## Supabase RLS — FK cascade delete gotcha

When a table has `ON DELETE CASCADE` and RLS is enabled on the child table, the cascade fires **after** the parent row is already deleted. Any child-table DELETE policy that does `EXISTS (SELECT 1 FROM parent WHERE id = ...)` will find nothing and deny the cascade, rolling back the whole operation with no error surfaced to the client.

**Rule:** Never rely on FK cascade for user-triggered deletes when child tables have RLS. Delete children manually in order (deepest first), then delete the parent. Each step's RLS check can still see the parent because it hasn't been deleted yet.

**Example** — `useDeletePoll` in `hooks/usePoll.ts`:
```ts
await supabase.from('trip_poll_votes').delete().eq('poll_id', poll_id);
await supabase.from('trip_poll_options').delete().eq('poll_id', poll_id);
await supabase.from('trip_polls').delete({ count: 'exact' }).eq('id', poll_id);
```

---

## Supabase RLS — SECURITY DEFINER for creator checks

When a new row's INSERT policy needs to verify a parent table (e.g. "is this user the creator of this group?"), the parent-table SELECT RLS may block the check — because the user is not yet a member and can't read the parent row.

**Rule:** Wrap parent-table lookups inside a `SECURITY DEFINER` function so the check bypasses RLS. Example: `is_group_creator()` in `supabase/migrations/20260608000002_fix_group_creator_insert.sql`.

---

## CI / Vercel pipeline

- Migrations run first (`supabase db push`), deploy runs only if migrations succeed.
- Pin the Vercel CLI version in `.github/workflows/deploy.yml` — `vercel@latest` has published broken releases before (`@vercel/static-build` 404). Current pin: `vercel@54.10.0`.
- If the pipeline fails on "Install Vercel CLI", check npm for a bad latest release and bump the pin to the last known good version.

---

# Project Structure & Architecture

## Two parallel screen trees: group trips vs solo trips

The app has two completely separate screen hierarchies for the same features. When a bug is reported or a feature needs adding, you must check **both** paths:

| Feature | Group-trip path | Solo-trip path |
|---|---|---|
| Trip home | `app/group/[id]/trip/[tripId]/index.tsx` | `app/trip/[tripId]/index.tsx` |
| Itinerary | `app/group/[id]/trip/[tripId]/itinerary.tsx` | `app/trip/[tripId]/itinerary.tsx` |
| Tasks | `app/group/[id]/trip/[tripId]/tasks.tsx` | `app/trip/[tripId]/tasks.tsx` |
| Budget | `app/group/[id]/trip/[tripId]/budget.tsx` | `app/trip/[tripId]/budget.tsx` |
| Expenses | `app/group/[id]/trip/[tripId]/expenses.tsx` | `app/trip/[tripId]/expenses.tsx` |
| Add expense | `app/group/[id]/trip/[tripId]/add-expense.tsx` | `app/trip/[tripId]/add-expense.tsx` |
| Polls | `app/group/[id]/trip/[tripId]/polls.tsx` | *(no solo equivalent)* |
| Chat | `app/group/[id]/trip/[tripId]/chat.tsx` | *(no solo equivalent)* |

Solo trips are created under `app/trip/new/` and stored in the `trips` table with `group_id = null` and `user_id` set. Group trips have `group_id` set.

**Known inconsistency:** Several solo-trip screens still use `Alert.alert` for inline validation (tasks, itinerary create form), which is silent on web. The group-trip versions use inline `errors` state. When fixing one path, always fix the other.

---

## Chat screens do not use React Query

**Files:** `app/group/[id]/chat.tsx`, `app/group/[id]/trip/[tripId]/chat.tsx`

Chat is implemented with raw `useState` + `useEffect` + Supabase realtime channel — not React Query. There are no query keys for messages, no cache invalidation, and no stale-time config. If you are debugging message delivery or loading issues, `queryClient` is irrelevant here.

Messages are loaded once on mount (`loadMessages()`) and appended via the Supabase `postgres_changes` subscription. Errors from both `loadMessages` and `send()` are currently unhandled (silent failures).

---

## `Group` type does not include `group_members` — use `(group as any)` workaround

**File:** `types/index.ts` — `Group` type has no `group_members` field.

The `useGroup` hook selects `*, group_members(*, user:users(*))` from Supabase, so the runtime object does contain members — but TypeScript doesn't know. Code that needs member data uses `(group as any)?.group_members ?? []`. This is intentional until the type is fixed.

**Affected files:** `budget.tsx`, `add-expense.tsx` (group-trip variants). Do not be surprised by the cast.

---

## Budget screen uses group members, not trip members

**File:** `app/group/[id]/trip/[tripId]/budget.tsx:24`

```ts
const members = (group as any)?.group_members ?? [];
```

The budget contribution list and per-person split calculation are driven by the group's full member list, not the trip's member list. This means:
- Members who are in the group but have not joined the trip appear in the contributions list.
- `per_person` budget totals scale with group size, not trip size.

This is a **known data integrity bug** (tracked in ISSUES.md §4.1). Do not write new code that assumes `budget.members` == trip members.

---

## Date parsing: always append `T12:00:00` to `YYYY-MM-DD` strings

`start_date` and `end_date` are stored as `YYYY-MM-DD` strings. `new Date('2024-07-15')` is parsed as UTC midnight, which displays as the **previous day** in any UTC− timezone.

**Rule:** Always parse bare date strings with a noon suffix:
```ts
new Date(dateStr + 'T12:00:00')  // safe across all UTC offsets
```

This fix is applied in some places (e.g. `trip/new/index.tsx:14`) but not everywhere. When adding new date display code, always use this pattern.

---

## `EXPO_PUBLIC_` environment variables are client-side — treat as public

Any variable prefixed `EXPO_PUBLIC_` (e.g. `EXPO_PUBLIC_GEMINI_API_KEY`) is inlined into the JavaScript bundle at build time. It is visible to anyone who inspects the bundle. Do not use this prefix for secrets.

Server-side secrets (API keys, service role keys) must live in Supabase Edge Functions or backend routes — never in `EXPO_PUBLIC_` vars.

