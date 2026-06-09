export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  created_at: string;
  upi_id?: string;
  upi_qr_url?: string;
}

export interface GroupMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string;
  role: 'owner' | 'member';
  joined_at: string;
  upi_id?: string;
  upi_qr_url?: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  name: string;
  amount: number;
  percentage?: number;
  shares?: number;
  settled: boolean;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  paid_by_user_id: string;
  paid_by_name: string;
  paid_by_avatar: string;
  split_type: 'equal' | 'percentage' | 'custom' | 'shares';
  category: string;
  date: string;
  notes: string;
  receipt_url?: string;
  created_by: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface Settlement {
  id: string;
  group_id: string;
  from_user_id: string;
  from_name: string;
  from_avatar: string;
  to_user_id: string;
  to_name: string;
  to_avatar: string;
  amount: number;
  currency: string;
  method: string;
  note: string;
  settled_at: string;
}

export interface ParticipantBalance {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string;
  total_paid: number;
  total_share: number;
  net_balance: number;
}

export interface SimplifiedDebt {
  from_user_id: string;
  from_name: string;
  from_avatar: string;
  to_user_id: string;
  to_name: string;
  to_avatar: string;
  amount: number;
}

export interface DetailedGroup {
  id: string;
  name: string;
  description: string;
  currency: string;
  created_by: string;
  created_at: string;
  members: GroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  balances: ParticipantBalance[];
  simplifiedDebts: SimplifiedDebt[];
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_expense' | 'tagged_expense' | 'settlement_request' | 'settlement_paid';
  title: string;
  message: string;
  group_id: string;
  group_name: string;
  created_at: string;
  is_read: boolean;
  email_sent: boolean;
  email_recipient?: string;
}
