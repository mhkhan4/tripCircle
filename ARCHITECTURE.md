# TripOrbit — Architecture

## Overview

TripOrbit is a mobile-first React Native app for friend groups who travel together. It combines group management, trip planning, shared budgeting, receipt-based expense tracking, and real-time chat into a single cohesive experience.

---

## Tech Stack

| Layer              | Technology                        | Why                                                              |
|--------------------|-----------------------------------|------------------------------------------------------------------|
| App framework      | React Native + Expo SDK 56        | Cross-platform iOS/Android, fast dev cycle, no native toolchain  |
| Routing            | Expo Router (file-based)          | Type-safe navigation, deep linking, layouts per segment          |
| Auth               | Supabase Auth                     | Google + Facebook OAuth, session persistence via AsyncStorage    |
| Database           | Supabase (PostgreSQL)             | Relational data, row-level security, realtime subscriptions      |
| Real-time chat     | Supabase Realtime                 | WebSocket subscriptions, no custom server needed                 |
| File storage       | Supabase Storage                  | Receipt image uploads, public CDN URLs                          |
| Receipt OCR        | DeepSeek Vision (OpenAI-compat.)  | Extracts amount, merchant, date, category from receipt photos    |
| Date picker        | react-native-calendars            | Calendar modal for trip date selection                           |
| Server state       | TanStack Query v5                 | Caching, background sync, stale-while-revalidate                 |
| Global state       | Zustand v5                        | Lightweight, auth session + active group context                 |
| Styling            | NativeWind v4 + Tailwind CSS v3   | Tailwind utility classes in React Native                         |
| Type safety        | TypeScript (strict mode)          | Full type coverage across all layers                             |

---

## Folder Structure

```
triporbit/
├── app/                          # Expo Router file-based screens
│   ├── _layout.tsx               # Root layout: providers, auth gate
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx             # Google + Facebook login
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab navigator
│   │   ├── index.tsx             # Home: list of groups
│   │   ├── calendar.tsx          # All trips across groups
│   │   └── profile.tsx           # User profile + sign out
│   └── group/
│       ├── _layout.tsx
│       ├── new/index.tsx         # Create group
│       └── [id]/
│           ├── index.tsx         # Group dashboard + trip list
│           ├── chat.tsx          # Group-level chat
│           └── trip/
│               ├── new/index.tsx # Create trip
│               └── [tripId]/
│                   ├── index.tsx       # Trip overview + budget widget
│                   ├── budget.tsx      # Budget setup + contributions
│                   ├── expenses.tsx    # Expense list
│                   ├── add-expense.tsx # Receipt scan + manual entry
│                   └── chat.tsx        # Trip-specific chat
├── components/                   # Reusable UI components (future)
├── hooks/
│   ├── useAuth.ts                # Supabase auth listener + profile fetch
│   ├── useGroup.ts               # Groups CRUD + join by invite code
│   ├── useTrip.ts                # Trips CRUD + all-trips across groups
│   └── useBudget.ts              # Budget, contributions, expenses, splits
├── lib/
│   ├── supabase.ts               # Supabase client (AsyncStorage session)
│   └── deepseek.ts               # DeepSeek Vision receipt scanner
├── store/
│   └── useAppStore.ts            # Zustand: session, user, activeGroup
├── types/
│   └── index.ts                  # All shared TypeScript types
├── supabase/
│   └── schema.sql                # Full DB schema + RLS policies
├── global.css                    # Tailwind base/components/utilities
├── tailwind.config.js            # NativeWind + theme colors
├── babel.config.js               # babel-preset-expo + nativewind/babel
└── metro.config.js               # withNativeWind CSS interop
```

---

## Data Flow

### Authentication
```
App launch → useAuth() → supabase.auth.getSession()
                       → AuthGate checks session
                       → redirect to /(auth)/login or /(tabs)
Login → OAuth provider → Supabase Auth → trigger creates users row
                                       → onAuthStateChange fires
                                       → session stored in AsyncStorage
```

### Expense + Receipt Flow
```
User taps "Add Expense"
  → Optional: Launch camera (expo-image-picker)
  → base64 image → scanReceipt() → DeepSeek Vision
  → OCR result auto-fills amount, description, and category
  → Upload image to Supabase Storage → get public URL
  → User confirms/edits → Submit
  → Insert expense row + expense_splits rows
  → TanStack Query invalidates ['expenses', tripId] + ['budget', tripId]
  → Budget dashboard updates in real time
```

### Real-time Chat
```
User opens chat screen
  → Load last 100 messages from Supabase
  → Subscribe: supabase.channel().on('postgres_changes', INSERT, messages)
  → New message arrives → fetch full row with sender join → append to state → FlatList scrolls to end
  → User sends: insert to messages table → all subscribers receive it
```

---

## Database Schema Summary

| Table                 | Key Columns                                                                      |
|-----------------------|----------------------------------------------------------------------------------|
| users                 | id (auth), email, full_name, avatar_url, provider                                |
| groups                | id, name, invite_code, created_by, latitude, longitude, is_discoverable, is_solo |
| group_members         | group_id, user_id, role (admin/member) — unique(group,user)                      |
| group_join_requests   | group_id, user_id, status (pending/approved/rejected), reviewed_by               |
| trips                 | id, group_id, title, destination, start/end_date, status                         |
| trip_members          | trip_id, user_id, role (admin/member), joined_at — unique(trip,user); creator auto-joined as admin |
| budgets               | id, trip_id (unique), total_amount, per_person_amount, currency                  |
| budget_contributions  | budget_id, user_id, pledged_amount, paid_amount, paid_at                         |
| expenses              | id, trip_id, amount, category, paid_by, receipt_url, ocr_raw                     |
| expense_splits        | expense_id, user_id, share_amount, is_settled                                    |
| messages              | id, group_id, trip_id (nullable), sender_id, content                             |
| trip_polls            | id, trip_id, created_by, question, poll_type, closes_at, resolved_option_id      |
| trip_poll_options     | id, poll_id, label                                                                |
| trip_poll_votes       | poll_id, user_id, option_id — primary key(poll_id, user_id) (one vote per person)|
| trip_tasks            | id, trip_id, created_by, title, category, assigned_to, due_date, completed_at    |
| trip_itinerary        | id, trip_id, created_by, entry_type, title, starts_at, ends_at, confirmation_number, link, notes |

### Row Level Security Model
- All tables protected by RLS
- `is_group_member(group_id)` helper function drives most policies
- `is_trip_admin(trip_id)` helper: true if caller is the trip creator or has `trip_members.role = 'admin'`
- Users can only see groups they belong to
- Only the paying user can insert an expense (`paid_by = auth.uid()`)
- Messages writable only by sender, readable by all group members
- Polls, tasks, and itinerary entries deletable by the item's creator OR any trip admin

---

## Key Design Decisions

### Why Supabase instead of a custom backend?
Supabase provides auth, database, realtime, and storage with RLS policies in one service. For a friend-group app at this scale, building a custom API would take 3x longer with no benefit.

### Why TanStack Query instead of raw useEffect/useState?
Trip and expense data is read far more than written. TanStack Query handles caching, background refetching, and stale-while-revalidate out of the box — critical for spotty mobile connectivity on trips.

### Why file-based routing (Expo Router)?
Deep linking is essential — sharing a trip link or joining via an invite code requires URL-based navigation. Expo Router also gives type-safe route params with `useLocalSearchParams`.

### Receipt OCR approach
DeepSeek Vision (OpenAI-API-compatible) is used for receipt scanning. The prompt constrains output to a strict JSON schema — amount, merchant, date, currency, and category — making parsing predictable. Category is auto-applied to the expense form but the user always reviews before submitting. Never auto-commit from OCR alone.

### Per-person budget scaling
Budgets can be set as a flat total or per-person. When per-person, `per_person_amount` is stored alongside `total_amount`. A Postgres trigger on `group_members` (INSERT/DELETE) automatically recalculates `total_amount = per_person_amount × current_member_count` for all affected trip budgets in that group.

### Expense splitting
Splits are computed against `trip_members`, not all `group_members`. This means only people who joined the trip share costs. The `expense_splits` table supports custom splits per user — this can be extended to a manual split screen without changing the schema.

### Trip membership model
Trips are opt-in within a group. When a trip is created, only the creator is auto-joined via `trip_members` with `role = 'admin'`. All other group members see a "Join" CTA on the trip card. Any member can leave; the trip creator can remove any member. This prevents forcing travel plans on group members who don't want to join. See `architecture/trip-members.md` for the full plan.

### Trip admin delegation
`trip_members.role` is `'admin' | 'member'` (default `'member'`). The trip creator is inserted as `'admin'` and can promote any other member to admin via the Members section in the trip detail screen. Admins can delete any poll, task, or itinerary entry (not just their own), and can remove or promote/demote other non-creator members. The trip creator's admin status cannot be removed by anyone — the shield button is hidden for the creator row. `is_trip_admin(trip_id)` is a DB helper function that backs the RLS delete policies.

---

## Environment Setup

```bash
# 1. Copy env file and fill in your keys
cp .env.example .env

# 2. Create a Supabase project at supabase.com
#    Run supabase/schema.sql in the SQL editor
#    Enable Google + Facebook OAuth providers in Auth settings
#    Create a "receipts" storage bucket (set to public)

# 3. Get your DeepSeek API key at platform.deepseek.com

# 4. Start the app
npx expo start
```

---

## Build Phases Status

| Phase | Feature                      | Status      |
|-------|------------------------------|-------------|
| 1     | Project setup                | Done        |
| 1     | Auth (Google/Facebook)       | Done        |
| 1     | Navigation shell             | Done        |
| 2     | Create/join groups           | Done        |
| 2     | Group dashboard              | Done        |
| 3     | Create trip                  | Done        |
| 3     | Trip detail screen           | Done        |
| 3     | Calendar view                | Done        |
| 4     | Set budget                   | Done        |
| 4     | Contribution tracking        | Done        |
| 5     | Manual expense entry         | Done        |
| 5     | Receipt scanning             | Done        |
| 5     | Budget dashboard             | Done        |
| 6     | Group chat                   | Done        |
| 6     | Trip chat                    | Done        |
| 7     | Push notifications           | Pending     |
| 8     | Offline queue                | Pending     |
| 8     | Date picker UI               | Done        |
| 8     | Per-person budget            | Done        |
| 8     | Chat avatar images           | Done        |
| 9     | Trip membership              | Done        |
| 9     | Join/Leave trip              | Done        |
| 9     | Trip member management       | Done        |
| 10    | Admin mark-contribution-paid | Done        |
| 10    | Discover nearby groups       | Done        |
| 10    | Request-to-join flow         | Done        |
| 10    | Admin approve/reject requests| Done        |
| 10    | Solo trip planning           | Done        |
| 11    | Trip polls with deadlines    | Done        |
| 11    | Trip task assignment         | Done        |
| 11    | Trip itinerary / bookings    | Done        |
| 11    | Payment reminders (in-chat)  | Done        |
| 12    | Trip admin roles & delegation| Done        |
| 12    | Admin delete for polls/tasks/itinerary | Done |
