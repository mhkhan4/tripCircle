# TripCircle — Architecture

## Overview

TripCircle is a mobile-first React Native app for friend groups who travel together. It combines group management, trip planning, shared budgeting, receipt-based expense tracking, and real-time chat into a single cohesive experience.

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
| Receipt OCR        | OpenAI GPT-4o Vision              | Extracts amount, merchant, date from receipt photos              |
| Server state       | TanStack Query v5                 | Caching, background sync, stale-while-revalidate                 |
| Global state       | Zustand v5                        | Lightweight, auth session + active group context                 |
| Styling            | NativeWind v4 + Tailwind CSS v3   | Tailwind utility classes in React Native                         |
| Type safety        | TypeScript (strict mode)          | Full type coverage across all layers                             |

---

## Folder Structure

```
tripcircle/
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
│   └── openai.ts                 # GPT-4o Vision receipt scanner
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
  → base64 image → scanReceipt() → GPT-4o Vision
  → OCR result auto-fills amount + description
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
  → New message arrives → append to local state → FlatList scrolls to end
  → User sends: insert to messages table → all subscribers receive it
```

---

## Database Schema Summary

| Table                 | Key Columns                                                    |
|-----------------------|----------------------------------------------------------------|
| users                 | id (auth), email, full_name, avatar_url, provider             |
| groups                | id, name, invite_code, created_by                              |
| group_members         | group_id, user_id, role (admin/member) — unique(group,user)   |
| trips                 | id, group_id, title, destination, start/end_date, status       |
| budgets               | id, trip_id (unique), total_amount, currency                   |
| budget_contributions  | budget_id, user_id, pledged_amount, paid_amount                |
| expenses              | id, trip_id, amount, category, paid_by, receipt_url, ocr_raw  |
| expense_splits        | expense_id, user_id, share_amount, is_settled                  |
| messages              | id, group_id, trip_id (nullable), sender_id, content           |

### Row Level Security Model
- All tables protected by RLS
- `is_group_member(group_id)` helper function drives most policies
- Users can only see groups they belong to
- Only the paying user can insert an expense (`paid_by = auth.uid()`)
- Messages writable only by sender, readable by all group members

---

## Key Design Decisions

### Why Supabase instead of a custom backend?
Supabase provides auth, database, realtime, and storage with RLS policies in one service. For a friend-group app at this scale, building a custom API would take 3x longer with no benefit.

### Why TanStack Query instead of raw useEffect/useState?
Trip and expense data is read far more than written. TanStack Query handles caching, background refetching, and stale-while-revalidate out of the box — critical for spotty mobile connectivity on trips.

### Why file-based routing (Expo Router)?
Deep linking is essential — sharing a trip link or joining via an invite code requires URL-based navigation. Expo Router also gives type-safe route params with `useLocalSearchParams`.

### Receipt OCR approach
GPT-4o Vision is more reliable than Google Cloud Vision or AWS Textract for messy real-world receipts (faded text, unusual layouts, non-English). The prompt constrains the response to a JSON schema, making parsing predictable. The user always reviews before submitting — never auto-commit from OCR alone.

### Expense splitting
Currently equal split among all group members. The `expense_splits` table supports custom splits per user — this can be extended to a manual split screen without changing the schema.

---

## Environment Setup

```bash
# 1. Copy env file and fill in your keys
cp .env.example .env

# 2. Create a Supabase project at supabase.com
#    Run supabase/schema.sql in the SQL editor
#    Enable Google + Facebook OAuth providers in Auth settings
#    Create a "receipts" storage bucket (set to public)

# 3. Get your OpenAI API key at platform.openai.com

# 4. Start the app
npx expo start
```

---

## Build Phases Status

| Phase | Feature               | Status      |
|-------|-----------------------|-------------|
| 1     | Project setup         | Done        |
| 1     | Auth (Google/Facebook)| Done        |
| 1     | Navigation shell      | Done        |
| 2     | Create/join groups    | Done        |
| 2     | Group dashboard       | Done        |
| 3     | Create trip           | Done        |
| 3     | Trip detail screen    | Done        |
| 3     | Calendar view         | Done        |
| 4     | Set budget            | Done        |
| 4     | Contribution tracking | Done        |
| 5     | Manual expense entry  | Done        |
| 5     | Receipt scanning      | Done        |
| 5     | Budget dashboard      | Done        |
| 6     | Group chat            | Done        |
| 6     | Trip chat             | Done        |
| 7     | Push notifications    | Pending     |
| 8     | Offline queue         | Pending     |
| 8     | Date picker UI        | Pending     |
