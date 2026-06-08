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
