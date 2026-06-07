export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  provider: 'google' | 'facebook' | 'email';
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
  group_id: string;
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
