import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase if keys exist. Keep local as master fallback for 100% up-time.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

let supabaseClient: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase Setup] Initialized Supabase cloud connection.');
  } catch (err: any) {
    console.error('[Supabase Setup] Initialization ignored: ', err.message);
  }
}

// Background syncer to push local update commits to Supabase if configured
async function syncToSupabase(data: DatabaseSchema) {
  if (!supabaseClient) return;
  try {
    const syncTable = async (tableName: string, rows: any[]) => {
      if (!rows || rows.length === 0) return;
      const { error } = await supabaseClient
        .from(tableName)
        .upsert(rows, { onConflict: 'id' });
      if (error) {
        console.warn(`[Supabase Sync] Warning on table ${tableName}:`, error.message);
      }
    };

    await Promise.all([
      syncTable('users', data.users),
      syncTable('groups', data.groups),
      syncTable('group_members', data.group_members),
      syncTable('expenses', data.expenses),
      syncTable('expense_splits', data.expense_splits),
      syncTable('settlements', data.settlements),
      syncTable('chat_messages', data.chat_messages || []),
      syncTable('notifications', data.notifications || []),
      syncTable('ai_conversations', data.ai_conversations)
    ]);
  } catch (err: any) {
    console.warn('[Supabase Sync] Bypassed sync:', err.message);
  }
}

// Warm-up database memory cache from Supabase on startup if present
async function pullFromSupabase(): Promise<Partial<DatabaseSchema> | null> {
  if (!supabaseClient) return null;
  try {
    const fetchTable = async (tableName: string) => {
      const { data, error } = await supabaseClient.from(tableName).select('*');
      if (error) {
        console.warn(`[Supabase Pull] Read bypassed for table ${tableName}:`, error.message);
        return null;
      }
      return data;
    };

    const [
      users,
      groups,
      group_members,
      expenses,
      expense_splits,
      settlements,
      chat_messages,
      notifications,
      ai_conversations
    ] = await Promise.all([
      fetchTable('users'),
      fetchTable('groups'),
      fetchTable('group_members'),
      fetchTable('expenses'),
      fetchTable('expense_splits'),
      fetchTable('settlements'),
      fetchTable('chat_messages'),
      fetchTable('notifications'),
      fetchTable('ai_conversations')
    ]);

    const pulled: Partial<DatabaseSchema> = {};
    if (users) pulled.users = users;
    if (groups) pulled.groups = groups;
    if (group_members) pulled.group_members = group_members;
    if (expenses) pulled.expenses = expenses;
    if (expense_splits) pulled.expense_splits = expense_splits;
    if (settlements) pulled.settlements = settlements;
    if (chat_messages) pulled.chat_messages = chat_messages;
    if (notifications) pulled.notifications = notifications;
    if (ai_conversations) pulled.ai_conversations = ai_conversations;

    return pulled;
  } catch (err: any) {
    console.warn('[Supabase Pull] Bypassed cache warm:', err.message);
    return null;
  }
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  password_hash: string;
  created_at: string;
  upi_id?: string;
  upi_qr_url?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  currency: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  currency: string;
  exchange_rate: number; // exchange rate relative to group's base currency
  paid_by_user_id: string;
  split_type: 'equal' | 'percentage' | 'custom' | 'shares';
  category: string;
  date: string;
  notes: string;
  receipt_url?: string;
  created_by: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  percentage?: number;
  shares?: number;
  settled: boolean;
}

export interface Settlement {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  method: string;
  note: string;
  settled_at: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  group_id: string;
  user_id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  created_at: string;
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

export interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  message: string;
  created_at: string;
}

export interface DatabaseSchema {
  users: User[];
  groups: Group[];
  group_members: GroupMember[];
  expenses: Expense[];
  expense_splits: ExpenseSplit[];
  settlements: Settlement[];
  ai_conversations: AIConversation[];
  notifications: Notification[];
  chat_messages?: ChatMessage[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'database.json');

// Default initial seed data
function getInitialData(): DatabaseSchema {
  // Simple MD5 or SHA256 simulation hashes for user passwords ('password')
  // Using simple pbkdf2 or standard SHA-256 for passwords
  const passwordHash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"; // SHA-256 hash of "password"

  const users: User[] = [
    {
      id: "u-alex",
      name: "Alex Mercer",
      email: "alex@example.com",
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
      password_hash: passwordHash,
      created_at: new Date("2026-01-01T10:00:00Z").toISOString(),
    },
    {
      id: "u-rahul",
      name: "Rahul Sharma",
      email: "rahul@example.com",
      avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80",
      password_hash: passwordHash,
      created_at: new Date("2026-01-02T11:00:00Z").toISOString(),
    },
    {
      id: "u-priya",
      name: "Priya Patel",
      email: "priya@example.com",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
      password_hash: passwordHash,
      created_at: new Date("2026-01-03T12:00:00Z").toISOString(),
    }
  ];

  const groups: Group[] = [
    {
      id: "g-europe",
      name: "Europe Trip 2026",
      description: "Paris, Rome and Amsterdam grand backpacking tour!",
      currency: "EUR",
      created_by: "u-alex",
      created_at: new Date("2026-05-15T09:00:00Z").toISOString(),
    }
  ];

  const group_members: GroupMember[] = [
    {
      id: "gm-1",
      group_id: "g-europe",
      user_id: "u-alex",
      role: "owner",
      joined_at: new Date("2026-05-15T09:00:00Z").toISOString(),
    },
    {
      id: "gm-2",
      group_id: "g-europe",
      user_id: "u-rahul",
      role: "member",
      joined_at: new Date("2026-05-15T10:00:00Z").toISOString(),
    },
    {
      id: "gm-3",
      group_id: "g-europe",
      user_id: "u-priya",
      role: "member",
      joined_at: new Date("2026-05-15T11:00:00Z").toISOString(),
    }
  ];

  // 10 mock expenses for rich visuals/charts
  const expenses: Expense[] = [
    {
      id: "e-1",
      group_id: "g-europe",
      title: "Paris Flight Tickets",
      amount: 1200,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-alex",
      split_type: "equal",
      category: "Travel",
      date: "2026-05-20",
      notes: "Group tickets booked early",
      created_by: "u-alex",
      created_at: new Date("2026-05-20T14:30:00Z").toISOString(),
    },
    {
      id: "e-2",
      group_id: "g-europe",
      title: "Rome Villa Booking",
      amount: 900,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-priya",
      split_type: "equal",
      category: "Utilities", // Accommodation/Lodging
      date: "2026-05-22",
      notes: "Beautiful airbnb in Trastevere!",
      created_by: "u-priya",
      created_at: new Date("2026-05-22T18:15:00Z").toISOString(),
    },
    {
      id: "e-3",
      group_id: "g-europe",
      title: "Grand Dinner at Trattoria",
      amount: 150,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-rahul",
      split_type: "percentage",
      category: "Food",
      date: "2026-05-23",
      notes: "Alex had 30%, Rahul had 40%, Priya had 30%",
      created_by: "u-rahul",
      created_at: new Date("2026-05-23T21:40:00Z").toISOString(),
    },
    {
      id: "e-4",
      group_id: "g-europe",
      title: "Train Rome to Venice",
      amount: 90,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-alex",
      split_type: "equal",
      category: "Travel",
      date: "2026-05-24",
      notes: "High speed trenitalia seats",
      created_by: "u-alex",
      created_at: new Date("2026-05-24T08:00:00Z").toISOString(),
    },
    {
      id: "e-5",
      group_id: "g-europe",
      title: "Venice Gelato Treat",
      amount: 18,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-rahul",
      split_type: "equal",
      category: "Food",
      date: "2026-05-25",
      notes: "Amazing pistachio and hazelnut gelato!",
      created_by: "u-rahul",
      created_at: new Date("2026-05-25T16:20:00Z").toISOString(),
    },
    {
      id: "e-6",
      group_id: "g-europe",
      title: "Louvre Museum Tickets",
      amount: 60,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-priya",
      split_type: "equal",
      category: "Entertainment",
      date: "2026-05-26",
      notes: "Pre-booked online slots",
      created_by: "u-priya",
      created_at: new Date("2026-05-26T10:10:00Z").toISOString(),
    },
    {
      id: "e-7",
      group_id: "g-europe",
      title: "Uber Rides around Paris",
      amount: 45,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-alex",
      split_type: "equal",
      category: "Travel",
      date: "2026-05-27",
      notes: "Late night taxi back to lodge",
      created_by: "u-alex",
      created_at: new Date("2026-05-27T23:50:00Z").toISOString(),
    },
    {
      id: "e-8",
      group_id: "g-europe",
      title: "Amsterdam Canal Dinner",
      amount: 120,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-priya",
      split_type: "equal",
      category: "Food",
      date: "2026-05-29",
      notes: "Splendid boat tour with pancakes",
      created_by: "u-priya",
      created_at: new Date("2026-05-29T19:30:00Z").toISOString(),
    },
    {
      id: "e-9",
      group_id: "g-europe",
      title: "Gift Souvenirs",
      amount: 75,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-rahul",
      split_type: "equal",
      category: "Shopping",
      date: "2026-05-30",
      notes: "Fridge magnets, keychains and miniature towers",
      created_by: "u-rahul",
      created_at: new Date("2026-05-30T17:45:00Z").toISOString(),
    },
    {
      id: "e-10",
      group_id: "g-europe",
      title: "Supermarket Snacks & Drinks",
      amount: 36,
      currency: "EUR",
      exchange_rate: 1.0,
      paid_by_user_id: "u-alex",
      split_type: "equal",
      category: "Utilities", // General supplies
      date: "2026-06-02",
      notes: "Baguettes, cheese, chips, and sodas",
      created_by: "u-alex",
      created_at: new Date("2026-06-02T12:00:00Z").toISOString(),
    }
  ];

  // Splits for the 10 expenses
  const expense_splits: ExpenseSplit[] = [];

  // e-1: 1200 split equally (Alex, Rahul, Priya - 400 each)
  users.forEach(u => {
    expense_splits.push({
      id: `es-1-${u.id}`,
      expense_id: "e-1",
      user_id: u.id,
      amount: 400,
      percentage: 33.33,
      settled: false
    });
  });

  // e-2: 900 split equally (300 each)
  users.forEach(u => {
    expense_splits.push({
      id: `es-2-${u.id}`,
      expense_id: "e-2",
      user_id: u.id,
      amount: 300,
      percentage: 33.33,
      settled: false
    });
  });

  // e-3: 150 split custom (Alex 30% [45], Rahul 40% [60], Priya 30% [45])
  expense_splits.push(
    { id: "es-3-alex", expense_id: "e-3", user_id: "u-alex", amount: 45, percentage: 30, settled: false },
    { id: "es-3-rahul", expense_id: "e-3", user_id: "u-rahul", amount: 60, percentage: 40, settled: false },
    { id: "es-3-priya", expense_id: "e-3", user_id: "u-priya", amount: 45, percentage: 30, settled: false }
  );

  // e-4: 90 split equally (30 each)
  users.forEach(u => {
    expense_splits.push({ id: `es-4-${u.id}`, expense_id: "e-4", user_id: u.id, amount: 30, percentage: 33.33, settled: false });
  });

  // e-5: 18 split equally (6 each)
  users.forEach(u => {
    expense_splits.push({ id: `es-5-${u.id}`, expense_id: "e-5", user_id: u.id, amount: 6, percentage: 33.33, settled: false });
  });

  // e-6: 60 split equally (20 each)
  users.forEach(u => {
    expense_splits.push({ id: `es-6-${u.id}`, expense_id: "e-6", user_id: u.id, amount: 20, percentage: 33.33, settled: false });
  });

  // e-7: 45 split equally (15 each)
  users.forEach(u => {
    expense_splits.push({ id: `es-7-${u.id}`, expense_id: "e-7", user_id: u.id, amount: 15, percentage: 33.33, settled: false });
  });

  // e-8: 120 split equally (40 each)
  users.forEach(u => {
    expense_splits.push({ id: `es-8-${u.id}`, expense_id: "e-8", user_id: u.id, amount: 40, percentage: 33.33, settled: false });
  });

  // e-9: 75 split equally (25 each)
  users.forEach(u => {
    expense_splits.push({ id: `es-9-${u.id}`, expense_id: "e-9", user_id: u.id, amount: 25, percentage: 33.33, settled: false });
  });

  // e-10: 36 split equally (12 each)
  users.forEach(u => {
    expense_splits.push({ id: `es-10-${u.id}`, expense_id: "e-10", user_id: u.id, amount: 12, percentage: 33.33, settled: false });
  });

  const settlements: Settlement[] = [
    {
      id: "s-1",
      group_id: "g-europe",
      from_user_id: "u-rahul",
      to_user_id: "u-alex",
      amount: 150,
      currency: "EUR",
      method: "Cash",
      note: "Partial settlement for flights",
      settled_at: new Date("2026-05-21T18:00:00Z").toISOString(),
      created_at: new Date("2026-05-21T18:00:00Z").toISOString(),
    }
  ];

  const ai_conversations: AIConversation[] = [
    {
      id: "aic-1",
      group_id: "g-europe",
      user_id: "u-alex",
      messages: [
        { role: "user", content: "Hi! Can you give me a summary of how we are doing on spending?", timestamp: new Date("2026-06-03T09:00:00Z").toISOString() },
        { role: "assistant", content: "Hello Alex! Currently, the 'Europe Trip 2026' group has spent a total of **€2,544**. As a group:\n\n- **You (Alex)** have spent €1,371 and are owed money.\n- **Priya** has spent €1,080.\n- **Rahul** has spent €243 and owes the most.\n\nYour biggest category is **Travel** (€1,335) followed closely by **Accommodation** (€900). Let me know if you would like me to detail your direct balances or suggest a simplified settlement path!", timestamp: new Date("2026-06-03T09:00:15Z").toISOString() }
      ],
      created_at: new Date("2026-06-03T09:00:00Z").toISOString()
    }
  ];

  return {
    users,
    groups,
    group_members,
    expenses,
    expense_splits,
    settlements,
    ai_conversations,
    notifications: [],
    chat_messages: []
  };
}

class Store {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    // Ensure all critical arrays exist even if loaded from older database.json
    if (!this.data.notifications) this.data.notifications = [];
    if (!this.data.chat_messages) this.data.chat_messages = [];

    // Run async cache warming if Supabase is connected
    if (supabaseClient) {
      pullFromSupabase().then(pulled => {
        if (pulled && Object.keys(pulled).length > 0) {
          this.update(data => {
            if (pulled.users) data.users = pulled.users;
            if (pulled.groups) data.groups = pulled.groups;
            if (pulled.group_members) data.group_members = pulled.group_members;
            if (pulled.expenses) data.expenses = pulled.expenses;
            if (pulled.expense_splits) data.expense_splits = pulled.expense_splits;
            if (pulled.settlements) data.settlements = pulled.settlements;
            if (pulled.notifications) data.notifications = pulled.notifications;
            if (pulled.chat_messages) data.chat_messages = pulled.chat_messages;
            if (pulled.ai_conversations) data.ai_conversations = pulled.ai_conversations;
          });
          console.log('[Supabase Pull] Warm local cache sync-initialized successfully.');
        }
      }).catch(err => {
        console.warn('[Supabase Pull] Bypassed warming:', err.message);
      });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (e) {
      console.error('Error loading database file. Initializing default mock data.', e);
    }
    const initial = getInitialData();
    this.save(initial);
    return initial;
  }

  private save(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      // Fire-and-forget async background synchronization
      syncToSupabase(data).catch(err => {
        console.warn('[Supabase Sync] Background sync warning:', err.message);
      });
    } catch (e) {
      console.error('Error writing to database file.', e);
    }
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public update(updater: (data: DatabaseSchema) => void) {
    updater(this.data);
    this.save(this.data);
  }
}

export const dbStore = new Store();
