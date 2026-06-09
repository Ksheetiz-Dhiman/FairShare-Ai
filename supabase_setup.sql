-- FairShare App Database Schema Setup
-- Copy and paste this script directly into your Supabase SQL Editor to provision all tables.

-- Disable row-level security (RLS) for simple setup or configure RLS as needed
-- Enable UUID or auto extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    currency TEXT DEFAULT 'USD',
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- owner, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL,
    exchange_rate NUMERIC(10, 6) DEFAULT 1.0,
    paid_by_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
    split_type TEXT DEFAULT 'equal', -- equal, percentage, custom, shares
    category TEXT DEFAULT 'Other',
    date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    receipt_url TEXT DEFAULT '',
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Expense Splits Table
CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY,
    expense_id TEXT REFERENCES expenses(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    percentage NUMERIC(6, 2),
    shares NUMERIC(10, 2),
    settled BOOLEAN DEFAULT FALSE
);

-- 6. Settlements Table
CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    to_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL,
    method TEXT DEFAULT 'Cash',
    note TEXT DEFAULT '',
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- new_expense, tagged_expense, settlement_request, settlement_paid
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT TRUE,
    email_recipient TEXT
);

-- 9. AI Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure default initial users are seeded for testing if tables empty
INSERT INTO users (id, name, email, avatar_url, password_hash, created_at)
VALUES 
('u-alex', 'Alex Mercer', 'alex@example.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, email, avatar_url, password_hash, created_at)
VALUES 
('u-rahul', 'Rahul Sharma', 'rahul@example.com', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, email, avatar_url, password_hash, created_at)
VALUES 
('u-priya', 'Priya Patel', 'priya@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO groups (id, name, description, currency, created_by, created_at)
VALUES 
('g-europe', 'Europe Trip 2026', 'Paris, Rome and Amsterdam grand backpacking tour!', 'EUR', 'u-alex', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO group_members (id, group_id, user_id, role, joined_at)
VALUES 
('gm-1', 'g-europe', 'u-alex', 'owner', NOW()),
('gm-2', 'g-europe', 'u-rahul', 'member', NOW()),
('gm-3', 'g-europe', 'u-priya', 'member', NOW())
ON CONFLICT (id) DO NOTHING;
