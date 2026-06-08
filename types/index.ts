export type UserProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  provider: 'google' | 'facebook' | 'email' | 'phone';
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  is_solo: boolean;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: UserProfile;
};

export type GroupMemberWithProfile = GroupMember & {
  user: UserProfile;
};

export type TripStatus = 'planning' | 'confirmed' | 'ongoing' | 'completed';

export type TripMember = {
  id: string;
  trip_id: string;
  user_id: string;
  joined_at: string;
};

export type TripMemberWithProfile = TripMember & {
  user: UserProfile;
};

export type Trip = {
  id: string;
  group_id: string | null;
  user_id: string | null;
  title: string;
  destination: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: TripStatus;
  cover_image: string | null;
  created_by: string;
  created_at: string;
};

export type Budget = {
  id: string;
  trip_id: string;
  total_amount: number;
  per_person_amount: number | null;
  currency: string;
  created_by: string;
  created_at: string;
};

export type BudgetContribution = {
  id: string;
  budget_id: string;
  user_id: string;
  pledged_amount: number;
  paid_amount: number;
  paid_at: string | null;
  user?: UserProfile;
};

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'activities'
  | 'shopping'
  | 'other';

export type Expense = {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  paid_by: string;
  receipt_url: string | null;
  ocr_raw: Record<string, unknown> | null;
  created_at: string;
  payer?: UserProfile;
  splits?: ExpenseSplit[];
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount: number;
  is_settled: boolean;
  settled_at: string | null;
  user?: UserProfile;
};

export type Message = {
  id: string;
  group_id: string;
  trip_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: UserProfile;
};

export type OcrResult = {
  amount: number | null;
  merchant: string | null;
  date: string | null;
  currency: string | null;
  category: ExpenseCategory | null;
  raw: string;
};

// ── Polls ────────────────────────────────────────────────────────────────────

export type PollType = 'destination' | 'date' | 'activity' | 'custom';

export type TripPollOption = {
  id: string;
  poll_id: string;
  label: string;
};

export type TripPollVote = {
  poll_id: string;
  user_id: string;
  option_id: string;
  voted_at: string;
};

export type TripPoll = {
  id: string;
  trip_id: string;
  created_by: string;
  question: string;
  poll_type: PollType;
  closes_at: string;
  resolved_option_id: string | null;
  created_at: string;
  options: TripPollOption[];
  votes: TripPollVote[];
  myVote: string | null;
};

// ── Tasks ────────────────────────────────────────────────────────────────────

export type TaskCategory = 'flights' | 'hotel' | 'activities' | 'transport' | 'packing' | 'other';

export type TripTask = {
  id: string;
  trip_id: string;
  created_by: string;
  title: string;
  category: TaskCategory;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  assignee?: UserProfile;
};

// ── Itinerary ────────────────────────────────────────────────────────────────

export type ItineraryEntryType = 'flight' | 'hotel' | 'activity' | 'restaurant' | 'transport' | 'other';

export type ItineraryEntry = {
  id: string;
  trip_id: string;
  created_by: string;
  entry_type: ItineraryEntryType;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  confirmation_number: string | null;
  link: string | null;
  notes: string | null;
  created_at: string;
};
