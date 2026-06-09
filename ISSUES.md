# TripCircle — Full Application Issue Review

> Reviewed: 2026-06-08  
> Branch: main  
> Scope: All screens, hooks, types, lib, store, config

---

## Table of Contents

1. [Critical Bugs](#1-critical-bugs)
2. [Security Issues](#2-security-issues)
3. [Silent Failures / Missing Error Handling](#3-silent-failures--missing-error-handling)
4. [Logic & Data Bugs](#4-logic--data-bugs)
5. [Type Safety Issues](#5-type-safety-issues)
6. [Group vs Solo Trip Inconsistencies](#6-group-vs-solo-trip-inconsistencies)
7. [Performance Issues](#7-performance-issues)
8. [UX / UI Issues](#8-ux--ui-issues)
9. [Feature Gaps](#9-feature-gaps)
10. [Code Quality / Minor Issues](#10-code-quality--minor-issues)

---

## 1. Critical Bugs

### 1.1 `expense_splits` insert errors are silently swallowed

**File:** `hooks/useBudget.ts:85-88`

```ts
await supabase.from('expense_splits').insert(
  splits.map((s) => ({ ...s, expense_id: expense.id }))
);
```

The return value is never destructured; if this insert fails (RLS rejection, network error), the expense row is committed to `expenses` with zero split records. The UI shows the expense but no one owes anything, with no error surfaced.

**Fix:** Destructure `{ error }` and throw if present.

---

### 1.3 Submit button is not disabled while receipt upload is in progress

**File:** `app/group/[id]/trip/[tripId]/add-expense.tsx:212-218`

The Save button is only disabled when `addExpense.isPending`. If the user taps Save while `uploading === true`, `receiptUrl` will still be `null` even though the upload will finish moments later. The expense is saved without the receipt URL.

**Fix:** Also disable the Save button when `uploading` is `true`.

---

### 1.4 Date formatting: `new Date(dateString)` is UTC, renders a day off in western time zones

**Files:** `app/group/[id]/index.tsx:50`, `app/(tabs)/calendar.tsx` (any bare `new Date(trip.start_date)` call)

`start_date` / `end_date` are stored as `YYYY-MM-DD`. `new Date('2024-07-15')` is UTC midnight, which is June 14 in UTC-1 through UTC-12 zones. Some places already apply the `+T12:00:00` workaround (e.g. `trip/new/index.tsx:14`) — the fix needs to be applied everywhere dates are rendered.

**Affected pattern:**
```ts
format(new Date(item.start_date), 'MMM d')  // ← wrong in negative UTC offsets
// should be:
format(new Date(item.start_date + 'T12:00:00'), 'MMM d')
```

---

## 2. Security Issues

### 2.1 Gemini API key is exposed in the client bundle

**File:** `lib/gemini.ts:6`

```ts
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
```

`EXPO_PUBLIC_` variables are inlined into the JavaScript bundle at build time. Anyone who downloads the app or opens the browser bundle can read the key. This allows unlimited quota abuse.

**Fix:** Move receipt scanning to a Supabase Edge Function. The Edge Function holds the key server-side and the client calls the function URL instead.

---

### 2.2 Receipt image upload has no file-type or size validation

**File:** `app/group/[id]/trip/[tripId]/add-expense.tsx:77-83`, `app/trip/[tripId]/add-expense.tsx` (same pattern)

```ts
const ext = asset.uri.split('.').pop() ?? 'jpg';
const path = `receipts/${tripId}/${Date.now()}.${ext}`;
// ...
contentType: `image/${ext}`,
```

The extension is derived from the URI string with no whitelist check. An attacker could manipulate the URI to upload arbitrary file types (e.g. `image/svg+xml` which can carry XSS payloads). There is also no size limit.

**Fix:** Validate `ext` against `['jpg','jpeg','png','webp']` before upload, and check `asset.fileSize` against a max (e.g. 10 MB).

---

### 2.3 Auth profile upsert failure leaves `user` as `null` with no error surfaced

**File:** `hooks/useAuth.ts:57-61`

If the Supabase `users` upsert fails (RLS issue, schema mismatch), `fetchProfile` silently returns after logging to the console. `useAppStore().user` remains `null`. Every screen that subsequently calls `user!.id` will throw an unhandled runtime error.

**Fix:** Propagate the error to the user (e.g. sign out and show an alert, or retry).

---

## 3. Silent Failures / Missing Error Handling

### 3.1 Chat `send()` swallows all errors

**Files:** `app/group/[id]/chat.tsx:53-63`, `app/group/[id]/trip/[tripId]/chat.tsx` (identical pattern)

```ts
async function send() {
  if (!text.trim()) return;
  const content = text.trim();
  setText('');
  await supabase.from('messages').insert({ ... });  // ← no error handling
}
```

If the insert fails (RLS, network, etc.), `text` has already been cleared and the message vanishes silently. The user has no idea their message was not sent.

**Fix:** Wrap in `try/catch`; restore `setText(content)` on failure and show an error state.

---

### 3.2 `user!.id` non-null assertion used without guard in chat screens

**Files:** `app/group/[id]/chat.tsx:59`, `app/group/[id]/trip/[tripId]/chat.tsx:59`

`user!.id` is used inside `send()` without first checking `if (!user) return`. While the auth gate should prevent unauthenticated access, race conditions during sign-out can leave a moment where `user` is null.

**Fix:** Add `if (!user) return;` before accessing `user.id`.

---

### 3.3 Receipt upload failure is invisible to the user

**File:** `app/group/[id]/trip/[tripId]/add-expense.tsx:90-93`

```ts
} catch {
  // empty — upload failure is silently ignored
} finally {
  setUploading(false);
}
```

When upload fails, `receiptUri` still shows the preview thumbnail with "Receipt scanned" text (green, line 148), making the user think the receipt was saved. In reality `receiptUrl` is `null`.

**Fix:** Show an error message (e.g. "Receipt upload failed. You can still save the expense without it.") and clear the receipt preview.

---

### 3.4 `loadMessages` errors are ignored in both chat screens

**Files:** `app/group/[id]/chat.tsx:42-51`, `app/group/[id]/trip/[tripId]/chat.tsx`

`loadMessages()` calls Supabase but discards the `error` from the destructured result. On a network failure, the screen silently shows an empty message list with no feedback.

**Fix:** Check `error` and show an empty-state error message.

---

## 4. Logic & Data Bugs

### 4.1 Budget member count uses group members, not trip members

**File:** `app/group/[id]/trip/[tripId]/budget.tsx:24-28`

```ts
const members = (group as any)?.group_members ?? [];
const memberCount = Math.max(members.length, 1);
```

When a trip uses `per_person` mode, the total is calculated as `perPerson × memberCount` where `memberCount` is the full group size — even if only a subset of group members actually joined the trip. This can produce an inflated or deflated budget total.

The same `members` array is also used to display the contribution list, so non-trip members appear as owing a share.

**Fix:** Use `useTripMembers(tripId)` for all budget logic.

---

### 4.2 No way to edit a budget after creation

**File:** `app/group/[id]/trip/[tripId]/budget.tsx`, `hooks/useBudget.ts`

`useCreateBudget` inserts a new budget row, but there is no `useUpdateBudget` mutation. Once a budget is set, the user has no way to change it. The UI only shows the "Set Trip Budget" form when `!budget`, so it's entirely hidden after first creation.

**Fix:** Add an edit button + `useUpdateBudget` mutation that calls `.update()` on the existing row.

---

### 4.3 `budget_contributions.pledged_amount` always equals `paid_amount`

**File:** `hooks/useBudget.ts:119-122`

```ts
insert({ budget_id, user_id, pledged_amount: paid_amount, paid_amount, ... })
```

The concept of pledging (committing to pay) vs actually paying exists in the schema, but the client always sets them equal. Members cannot pledge a different amount than what they actually pay, making the field misleading.

**Fix:** Either remove `pledged_amount` from the UI model, or add a separate "pledge" flow.

---

### 4.4 `name[0]` direct index access — potential crash on empty group name

**File:** `app/(tabs)/index.tsx:61`

```ts
const letter = item.name[0].toUpperCase();
```

If `item.name` is an empty string, `.toUpperCase()` throws. Group names could theoretically be empty if inserted directly via a migration or admin tool.

**Fix:** `item.name[0]?.toUpperCase() ?? '?'`

---

### 4.5 Poll closing-time calendar uses wrong `minDate` — past dates allowed

**File:** `app/group/[id]/trip/[tripId]/polls.tsx`

The poll creation form accepts a `closesDate` via a Calendar component. The calendar's `minDate` is not set to today, so a user can pick a closing date in the past, creating a poll that is immediately expired.

**Fix:** Pass `minDate={new Date().toISOString().split('T')[0]}` to the Calendar for poll close date selection.

---

### 4.6 `getMarkedDates` marks range only when `calendarTarget === 'end'`, but not when viewing start

**File:** `app/group/[id]/trip/new/index.tsx:48-68`, `app/trip/new/index.tsx` (same)

When re-selecting the start date (after an end date is already set), the currently selected start date is shown as a single dot, but the previously chosen end date and range are not visualised. This is confusing because the existing selection appears to disappear.

**Fix:** When `calendarTarget === 'start'` and `endDate` is set, also render the full range in `getMarkedDates`.

---

## 5. Type Safety Issues

### 5.1 `TripMember` type is missing the `user` field

**File:** `types/index.ts:40-46`

`TripMember` does not have a `user?: UserProfile` field (only `TripMemberWithProfile` does). Multiple screens cast `tripMembers` or their items to `any` to access `.user`, bypassing type checking.

**Affected files:** `app/group/[id]/trip/[tripId]/budget.tsx:24`, `app/group/[id]/trip/[tripId]/add-expense.tsx:47-48`

**Fix:** Add `user?: UserProfile` directly to `TripMember`, consistent with `GroupMember`.

---

### 5.2 `(group as any)?.group_members` — unsafe `any` cast across multiple screens

**Files:** `app/group/[id]/trip/[tripId]/budget.tsx:24`, `app/group/[id]/trip/[tripId]/add-expense.tsx:47`

`useGroup` returns `Group | undefined`. The `Group` type doesn't include `group_members`, so the cast to `any` is used everywhere. This skips type checking on the member array entirely.

**Fix:** Extend the `Group` type to include `group_members?: GroupMember[]` (matching the Supabase select), or return the members as a separate query result.

---

### 5.3 `OcrResult.category` is typed `ExpenseCategory | null` but Gemini can return arbitrary strings

**File:** `lib/gemini.ts:54-60`, `types/index.ts:130-137`

The returned `parsed.category` is cast directly to `ExpenseCategory | null`. Gemini's response is not validated against the union. If Gemini returns an unexpected string, it'll be silently set as `category`, potentially causing display bugs or DB constraint failures.

**Fix:** Validate `parsed.category` against the `CATEGORIES` array before accepting it; fall back to `'other'` if unknown.

---

## 6. Group vs Solo Trip Inconsistencies

### 6.1 Itinerary: solo trips can only be deleted by creator; group trips allow admins too

**Files:** `app/trip/[tripId]/itinerary.tsx:111` vs `app/group/[id]/trip/[tripId]/itinerary.tsx:122`

```ts
// solo
const canDelete = entry.created_by === user?.id;

// group
const canDelete = entry.created_by === user?.id || isTripAdmin;
```

The solo trip version does not have an admin path (solo trips have no admins), but the inconsistency shows different delete capabilities that aren't documented.

---

### 6.2 Solo task creation uses `Alert.alert` for validation; group tasks use inline `errors` state

**Files:** `app/trip/[tripId]/tasks.tsx:53` vs `app/group/[id]/trip/[tripId]/tasks.tsx:62-64`

```ts
// solo — uses Alert.alert
if (!title.trim()) return Alert.alert('Missing title', 'Enter a task title.');

// group — uses inline error state
if (!title.trim()) newErrors.title = 'Task title is required.';
```

On web, `Alert.alert` is silent (documented AGENTS.md known issue). Solo trip task creation is broken on web.

**Fix:** Apply the inline `errors` state pattern to the solo trip tasks screen.

---

### 6.3 Solo trip itinerary uses `Alert.alert` for validation; group uses inline `errors` state

**File:** `app/trip/[tripId]/itinerary.tsx:64` vs `app/group/[id]/trip/[tripId]/itinerary.tsx:72`

Same problem as 6.2: `Alert.alert('Missing title', ...)` in the solo path is silent on web.

**Fix:** Use inline `errors` state pattern consistently.

---

### 6.4 Solo trips have no polls feature

Group trips have a full polls screen (`app/group/[id]/trip/[tripId]/polls.tsx`). Solo trips have no equivalent. This is arguably intentional, but for a solo trip a "personal polls/voting" to decide between destinations would still be useful.

---

### 6.5 Solo trips silently auto-assign all tasks to the current user

**File:** `app/trip/[tripId]/tasks.tsx:59`

```ts
assigned_to: user!.id,
```

No assignment UI is shown for solo trips. Tasks are always auto-assigned to the creator. This is fine functionally, but users who want to track unassigned tasks can't.

---

## 7. Performance Issues

### 7.1 `getMarkedDates` not memoised — recalculates on every render

**Files:** `app/group/[id]/trip/new/index.tsx:48-68`, `app/trip/new/index.tsx`

`getMarkedDates()` is called inline in JSX (`markedDates={getMarkedDates()}`), so it runs on every render including unrelated state changes. For a large date range it iterates every day between start and end.

**Fix:** Wrap in `useMemo`, e.g.:
```ts
const markedDates = useMemo(() => getMarkedDates(), [calendarTarget, startDate, endDate]);
```

---

### 7.2 `useTripMembers` called per trip card in group screen — N+1 query pattern

**File:** `app/group/[id]/index.tsx:21`

```ts
function TripCard({ item, groupId }: { item: Trip; groupId: string }) {
  const { data: tripMembers } = useTripMembers(item.id);
```

Each `TripCard` in the `FlatList` fires a separate `useTripMembers` query. With 10 trips, that's 10 separate Supabase requests on screen load.

**Fix:** Batch-fetch all trip members in the parent query, or include member counts via Supabase foreign table select.

---

### 7.3 Itinerary date grouping uses a linear scan for each entry — O(n²)

**Files:** `app/group/[id]/trip/[tripId]/itinerary.tsx:109-118`, `app/trip/[tripId]/itinerary.tsx:99-107`

```ts
const existing = grouped.find((g) => g.date === dateKey);
```

`grouped.find` is O(n) called for every entry. With a large itinerary (50+ entries spanning many days) this is O(n²).

**Fix:** Use a `Map<string, Group>` keyed on date for O(1) lookup.

---

## 8. UX / UI Issues

### 8.1 Receipt upload error leaves green "Receipt scanned" badge visible

Already described in §3.3. The UX impact: user submits expense believing the receipt was saved; it is not.

---

### 8.2 "Send Reminder" can be spammed — no rate-limit or cooldown

**File:** `app/group/[id]/trip/[tripId]/budget.tsx:40-62`

The Remind button inserts a new chat message every time it is tapped. An admin could accidentally (or intentionally) flood the trip chat with identical payment reminders.

**Fix:** Track `reminded_at` per contribution, disable the button for N hours after last send, or batch reminders into one message (already done) but add a UI cooldown.

---

### 8.3 Empty trip list on home screen renders twice during load (flash of empty state)

**File:** `app/(tabs)/index.tsx`

`groups` and `soloTrips` queries briefly return `undefined` before resolving. `isEmpty` is `true` during this window, showing the onboarding/empty state, then the data loads and the screen re-renders. This is visually jarring on every app open.

**Fix:** Add a combined `isLoading` guard that shows a skeleton or spinner instead of the empty state while data is being fetched.

---

### 8.4 Budget amount input label always says "USD" regardless of stored currency

**File:** `app/group/[id]/trip/[tripId]/add-expense.tsx:158`, `app/group/[id]/trip/[tripId]/budget.tsx:115`

The UI labels "Amount (USD)" and shows `$` symbols. The `Budget` type has a `currency` field and `Expense` has `currency`, but the displayed currency is always USD.

**Fix:** Display the actual `budget.currency` in the UI, or default to it when creating expenses.

---

### 8.5 Poll countdown says "Closes soon" for anything under 1 hour — includes negative values (already closed)

**File:** `app/group/[id]/trip/[tripId]/polls.tsx:23-29`

```ts
function countdown(closesAt: string) {
  const hours = differenceInHours(new Date(closesAt), new Date());
  if (hours < 1) return 'Closes soon';
  ...
}
```

If `hours` is negative (poll already closed), this returns "Closes soon" instead of "Closed". `isPast` is imported but only used at the call site to decide whether to show the countdown at all — double-check the conditional.

**Fix:** Return `'Closed'` if `hours <= 0`.

---

### 8.6 Calendar `markingType` mismatch for period highlighting

**File:** `app/group/[id]/trip/new/index.tsx:189`

```ts
markingType={calendarTarget === 'end' && startDate && endDate ? 'period' : 'simple'}
```

`getMarkedDates` uses `color` / `textColor` keys for range days (period marking format), but when `endDate` is not yet set (user is selecting the end date for the first time), `markingType` falls back to `'simple'`, which ignores the `color` key. The range highlighting will not render while the user is mid-selection.

**Fix:** Use `markingType='period'` whenever `calendarTarget === 'end'` (regardless of whether `endDate` is set), and update `getMarkedDates` to handle the in-progress state.

---

## 9. Feature Gaps

### 9.1 No way to view / open a receipt after it is uploaded

Receipts are uploaded to Supabase Storage and the public URL is saved. The expense list shows category, description, and amount — but no receipt icon or tap-to-open gesture. Users can upload receipts but never see them again.

**Affected files:** `app/group/[id]/trip/[tripId]/expenses.tsx`, `app/trip/[tripId]/expenses.tsx`

---

### 9.2 No error boundary — any render crash takes down the whole app

The app has no React Error Boundary anywhere. A runtime error in any screen (e.g. the `user!.id` crash from §3.2) will unmount the entire component tree with a white screen and no recovery path.

**Fix:** Wrap `<Stack>` in an `ErrorBoundary` component that renders a "Something went wrong — restart the app" fallback.

---

### 9.3 `loadMessages` is not paginated — only fetches the last 100 messages

**Files:** `app/group/[id]/chat.tsx:43-50`, `app/group/[id]/trip/[tripId]/chat.tsx`

`.limit(100)` is applied, so older messages are permanently inaccessible. There is no "load more" button or infinite scroll.

---

### 9.4 No offline support or optimistic UI

All data is fetched live from Supabase. If the connection drops, all screens show stale or empty data with no feedback. React Query's offline cache is not configured.

---

### 9.5 No push notification delivery for budget reminders or chat messages

`handleSendReminder` posts a message to the DB but there is no push notification, so members who haven't opened the app won't see it until they manually open the trip chat.

---

## 10. Code Quality / Minor Issues

### 10.1 Five `console.log` statements left in `lib/gemini.ts`

**File:** `lib/gemini.ts:36,39,46,51,53`

These log the raw Gemini API response (including the full base64-encoded receipt image JSON body path) and parsed financial data to the console in production builds.

**Fix:** Remove all `console.log` calls, or gate them behind a `__DEV__` check.

---


---

### 10.3 `(group as any)` cast repeated across three files — should be a proper type

Mentioned in §5.2. The repeated `(group as any)?.group_members` pattern across `budget.tsx`, `add-expense.tsx`, and possibly others is a maintenance risk — the `any` cast will hide future type errors if the query shape changes.

---

### 10.4 `buildTimestamp` silently defaults to midnight when no time is entered

**Files:** `app/group/[id]/trip/[tripId]/itinerary.tsx:63-68`, `app/trip/[tripId]/itinerary.tsx:56-61`

```ts
const t = match ? ... : '00:00';
return new Date(`${dateStr}T${t}:00`).toISOString();
```

If the user leaves the time field blank, the entry is stored at 00:00 local time. This is also subject to the UTC timezone issue from §1.4.

**Fix:** Store date-only entries with `starts_at = null` when no time is provided, and display them in the "No time set" bucket rather than "12:00 AM".

---

### 10.5 `getMarkedDates` uses `any` for marks object

**File:** `app/group/[id]/trip/new/index.tsx:49`

```ts
const marks: Record<string, any> = {};
```

The `react-native-calendars` package exports `MarkedDates` type. Using `any` allows mistyped mark objects that the library will silently ignore.

---

## Summary

| Category | Count |
|---|---|
| Critical bugs | 4 |
| Security | 3 |
| Silent failures / error handling | 4 |
| Logic & data bugs | 6 |
| Type safety | 3 |
| Group/solo inconsistencies | 5 |
| Performance | 3 |
| UX / UI | 6 |
| Feature gaps | 5 |
| Code quality / minor | 5 |
| **Total** | **44** |

### Recommended Priority Order

1. **Fix first (data integrity):** §1.2 expense_splits not checked, §4.1 budget using wrong member list, §1.3 submit during upload
2. **Fix first (auth / security):** §2.1 Gemini key in client bundle, §3.2 `user!.id` guard, §2.3 profile upsert failure
3. **Fix before ship (web compatibility):** §6.2 and §6.3 `Alert.alert` in solo trip screens — broken on web per AGENTS.md known issue
4. **Fix soon:** §3.1 silent chat errors
5. **Polish pass:** UX issues §8.1–§8.6, performance issues §7.1–§7.3
