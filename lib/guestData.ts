import type { Group, Trip, Budget, BudgetContribution, Expense, Message } from '../types';
import { GUEST_USER } from '../store/useAppStore';

export const GUEST_GROUP: Group = {
  id: 'guest-group-1',
  name: 'Weekend Warriors',
  description: 'The crew for all adventures',
  avatar_url: null,
  invite_code: 'DEMO01',
  created_by: 'guest-000',
  created_at: new Date().toISOString(),
};

export const GUEST_TRIP: Trip = {
  id: 'guest-trip-1',
  group_id: 'guest-group-1',
  title: 'Beach Weekend',
  destination: 'Miami, Florida',
  description: 'Sun, sand, and good vibes.',
  start_date: '2026-07-04',
  end_date: '2026-07-06',
  status: 'confirmed',
  cover_image: null,
  created_by: 'guest-000',
  created_at: new Date().toISOString(),
};

export const GUEST_BUDGET: Budget & { budget_contributions: BudgetContribution[] } = {
  id: 'guest-budget-1',
  trip_id: 'guest-trip-1',
  total_amount: 1200,
  currency: 'USD',
  created_by: 'guest-000',
  created_at: new Date().toISOString(),
  budget_contributions: [
    {
      id: 'gc-1',
      budget_id: 'guest-budget-1',
      user_id: 'guest-000',
      pledged_amount: 400,
      paid_amount: 400,
      paid_at: new Date().toISOString(),
      user: GUEST_USER,
    },
  ],
};

export const GUEST_EXPENSES: Expense[] = [
  {
    id: 'ge-1',
    trip_id: 'guest-trip-1',
    amount: 180,
    currency: 'USD',
    category: 'accommodation',
    description: 'Hotel - Night 1',
    paid_by: 'guest-000',
    receipt_url: null,
    ocr_raw: null,
    created_at: new Date().toISOString(),
    payer: GUEST_USER,
    splits: [],
  },
  {
    id: 'ge-2',
    trip_id: 'guest-trip-1',
    amount: 64,
    currency: 'USD',
    category: 'food',
    description: 'Seafood dinner',
    paid_by: 'guest-000',
    receipt_url: null,
    ocr_raw: null,
    created_at: new Date().toISOString(),
    payer: GUEST_USER,
    splits: [],
  },
  {
    id: 'ge-3',
    trip_id: 'guest-trip-1',
    amount: 45,
    currency: 'USD',
    category: 'transport',
    description: 'Uber from airport',
    paid_by: 'guest-000',
    receipt_url: null,
    ocr_raw: null,
    created_at: new Date().toISOString(),
    payer: GUEST_USER,
    splits: [],
  },
];

export const GUEST_MESSAGES: Message[] = [
  {
    id: 'gm-1',
    group_id: 'guest-group-1',
    trip_id: null,
    sender_id: 'guest-000',
    content: 'Who\'s bringing the sunscreen? 🏖️',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    sender: GUEST_USER,
  },
  {
    id: 'gm-2',
    group_id: 'guest-group-1',
    trip_id: null,
    sender_id: 'guest-000',
    content: 'I booked the hotel, $180/night split between us',
    created_at: new Date().toISOString(),
    sender: GUEST_USER,
  },
];
