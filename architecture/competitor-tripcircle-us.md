# Competitor Analysis: tripcircle.us → What We Should Build

## Executive Summary

tripcircle.us is a direct competitor building the same product. They are at **waiting list stage** (private beta mid-2026), NVIDIA Inception-backed, and Founder Institute Chicago alumni. They interviewed 300+ group travelers and distilled 4 core failure modes for group trips.

We are ahead on technical features (we already ship: groups, trips, budgets, OCR expense scanning, real-time chat, discover nearby, solo trips). But we are missing the **decision-making layer** they identified as the #1 reason group trips die.

This document maps their validated research to specific features we should implement.

---

## Their Research Findings (300+ Interviews)

### 4 Failure Modes for Group Trips

| # | Pattern | Their Quote |
|---|---------|-------------|
| 1 | **Decision paralysis** | Group chats produce endless voting cycles without resolution |
| 2 | **Unequal planning burden** | One person shoulders all logistics solo |
| 3 | **Financial friction** | Cost splitting and payment reminders create interpersonal tension |
| 4 | **Trip abandonment** | Plans dissolve before execution despite initial enthusiasm |

### Severity Signals
- Users report **6-month decision delays** on destination selection
- Some trips remain **multi-year unexecuted plans**
- The root cause in nearly every case: no structure, no deadlines, no accountability

---

## Feature Gap Analysis: Us vs. Them

### Where We're Ahead
| Feature | Us | Them |
|---------|-----|------|
| Receipt OCR (AI expense scanning) | ✅ Live | ❌ Not mentioned |
| Discover nearby groups | ✅ Live | ❌ Not mentioned |
| Solo trip planning | ✅ Live | ❌ Not mentioned |
| Real-time chat (group + trip level) | ✅ Live | ❌ Not mentioned |
| Trip membership (opt-in per trip) | ✅ Live | ❌ Not mentioned |

### Where They Have an Edge (What We're Missing)
| Feature | Us | Them |
|---------|-----|------|
| Destination/date/budget voting polls | ❌ Missing | ✅ Core feature |
| **Deadline-driven polls** (auto-resolve) | ❌ Missing | ✅ Core differentiator |
| Decision history log | ❌ Missing | ✅ Listed |
| Planning task assignment across members | ❌ Missing | Implied |
| Automated payment reminders (push) | ❌ Missing (Phase 7) | ✅ Listed |
| Centralized booking/itinerary repository | ❌ Missing | ✅ Listed |

---

## Features to Build (Prioritized by Research Impact)

### Priority 1 — Trip Voting & Polls (Kills Failure Mode #1 and #4)

This is their flagship feature and the most validated pain point from their 300 interviews. Without it, group trip plans stall indefinitely.

**What to build:**
A poll system inside each trip where members vote on options (destinations, dates, activity choices) with a hard deadline. When the deadline passes, the poll auto-resolves to the winning option and notifies all members.

**DB Schema:**
```sql
create table public.trip_polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  created_by uuid references public.users not null,
  question text not null,
  poll_type text not null check (poll_type in ('destination', 'date', 'activity', 'custom')),
  closes_at timestamptz not null,
  resolved_option_id uuid,           -- set when poll closes
  created_at timestamptz default now()
);

create table public.trip_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.trip_polls on delete cascade not null,
  label text not null,               -- "Cancun", "Chicago", "June 14-18"
  vote_count int not null default 0
);

create table public.trip_poll_votes (
  poll_id uuid references public.trip_polls not null,
  user_id uuid references public.users not null,
  option_id uuid references public.trip_poll_options not null,
  voted_at timestamptz default now(),
  primary key (poll_id, user_id)     -- one vote per person per poll
);
```

**App files to create/modify:**
| File | Action |
|------|--------|
| `app/group/[id]/trip/[tripId]/polls.tsx` | NEW — poll list + create poll flow |
| `app/group/[id]/trip/[tripId]/index.tsx` | Add "Polls" section above chat entry point |
| `hooks/usePoll.ts` | NEW — usePolls, useCreatePoll, useVote, usePollResult |
| `types/index.ts` | Add TripPoll, TripPollOption, TripPollVote types |

**UX rules (critical per their research):**
- Creating a poll REQUIRES a deadline — no optional deadlines, ever
- Deadline shows a countdown in the UI ("Closes in 2d 4h")
- After deadline, poll locks and shows winner prominently
- All members get a push notification when: poll created, 24h before close, poll resolved
- Votes are visible (who voted for what) after the poll closes, hidden while open

---

### Priority 2 — Trip Planning Checklist / Task Assignment (Kills Failure Mode #2)

Their research shows one person burns out doing everything. Assigning tasks across members distributes the load and creates accountability.

**What to build:**
A task checklist per trip. Each task can be assigned to a specific member with an optional due date. Members can mark their tasks done. Unassigned tasks show up as available for anyone to claim.

**DB Schema:**
```sql
create table public.trip_tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  created_by uuid references public.users not null,
  title text not null,
  category text check (category in ('booking', 'logistics', 'packing', 'research', 'other')),
  assigned_to uuid references public.users,   -- null = unassigned
  due_date date,
  completed_at timestamptz,
  completed_by uuid references public.users,
  created_at timestamptz default now()
);
```

**App files:**
| File | Action |
|------|--------|
| `app/group/[id]/trip/[tripId]/tasks.tsx` | NEW — task list, add task, assign member |
| `app/group/[id]/trip/[tripId]/index.tsx` | Add "Tasks" card with incomplete count badge |
| `hooks/useTask.ts` | NEW — useTripTasks, useCreateTask, useCompleteTask |
| `types/index.ts` | Add TripTask type |

**UX rules:**
- Task categories: Flights, Hotels, Activities, Car Rental, Packing, Misc
- Unassigned tasks show a "Claim" button anyone can tap
- Assigned tasks show the assignee's avatar
- Completing a task fires a push notification to the group ("Alex booked the hotel!")
- Trip overview card shows "X of Y tasks done" progress bar

---

### Priority 3 — Payment Reminders (Kills Failure Mode #3)

We have budget contributions but no automated nudge when someone hasn't paid. This is a validated source of interpersonal friction.

**What to build:**
Automated push notifications and in-app reminders for unpaid budget contributions. Admin can trigger a manual reminder or set an automatic reminder schedule.

**DB Schema (no migration needed, add column):**
```sql
alter table public.budgets add column if not exists reminder_enabled boolean not null default true;
alter table public.budgets add column if not exists reminder_days_before int default 7; -- remind X days before trip
```

**App files:**
| File | Action |
|------|--------|
| `app/group/[id]/trip/[tripId]/budget.tsx` | Add "Send Reminder" button for admins on Pending rows |
| `hooks/useBudget.ts` | Add useSendPaymentReminder mutation (calls Edge Function or push) |

**Reminder triggers (implement with Supabase Edge Functions or scheduled CRON):**
1. Admin manually taps "Remind" on a pending member — immediate push to that member
2. 7 days before trip start date — auto push to all members with pending contributions
3. 2 days before trip start date — final reminder push

---

### Priority 4 — Trip Itinerary / Booking Repository (Kills Failure Mode #4)

Their third core feature: a centralized place for all confirmed bookings. Right now our trip has no place to attach a flight confirmation, hotel link, or activity reservation.

**What to build:**
A simple itinerary tab per trip. Members can add entries (type: flight, hotel, activity, restaurant, transport, other) with name, date/time, confirmation number, link, and notes. Displayed as a timeline sorted by date.

**DB Schema:**
```sql
create table public.trip_itinerary (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  created_by uuid references public.users not null,
  entry_type text not null check (entry_type in ('flight', 'hotel', 'activity', 'restaurant', 'transport', 'other')),
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  confirmation_number text,
  link text,
  notes text,
  created_at timestamptz default now()
);
```

**App files:**
| File | Action |
|------|--------|
| `app/group/[id]/trip/[tripId]/itinerary.tsx` | NEW — timeline view, add entry sheet |
| `app/group/[id]/trip/[tripId]/index.tsx` | Add "Itinerary" card showing next upcoming entry |
| `hooks/useItinerary.ts` | NEW — useTripItinerary, useAddItineraryEntry |
| `types/index.ts` | Add ItineraryEntry type |

---

## What We Should NOT Copy

| Their Feature | Our Take |
|--------------|----------|
| Founding member / waitlist program | We're building a real app, not a landing page. Don't gate behind a waitlist. |
| "Locked-in founding pricing" | Premature monetization signaling — focus on adoption first. |
| 1,000 charter member limit | Artificial scarcity for a mobile app makes no sense. |

---

## Implementation Order

Based on research impact (most-validated pain point first):

1. **Trip Polls** — this is the single feature that prevents trip abandonment, their #1 validated finding
2. **Trip Tasks** — distributes planning burden, second-most cited complaint
3. **Payment Reminders** — we already have the data; this is just notifications wiring
4. **Trip Itinerary** — nice-to-have but lower urgency since chat can serve this informally today

---

## Competitive Position Summary

tripcircle.us is validating the market we're already building in. Their 300-interview research confirms our core thesis. They will not launch until mid-2026. We have:
- A working app with more features than their marketing describes
- No waitlist blocker — real users can use it today
- A gap only in the **decision-making layer** (polls, tasks, itinerary)

Shipping Priority 1 (polls) before they launch puts us unambiguously ahead on the feature set their own research says matters most.
