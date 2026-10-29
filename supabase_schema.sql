-- ========================================================
-- Supabase Schema for CollectPulse Money Collection Platform
-- Run this in your Supabase Project -> SQL Editor
-- ========================================================

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  pair_id INTEGER NOT NULL,
  target_upi_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  payer_name TEXT,
  payer_email TEXT NOT NULL,
  payer_phone TEXT,
  note TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  razorpay_payment_id TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Ensure remarks column exists on existing tables
ALTER TABLE payments ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Fast Indexing for group tracking and status searches
CREATE INDEX IF NOT EXISTS idx_payments_group ON payments(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- ========================================================
-- Fix 1: Enable Row Level Security (RLS) with explicit policies
-- ========================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any
DROP POLICY IF EXISTS "Allow anon insert payments" ON payments;
DROP POLICY IF EXISTS "Allow anon select payments" ON payments;
DROP POLICY IF EXISTS "Allow anon update payments" ON payments;

-- Allow inserting contributions from the portal
CREATE POLICY "Allow anon insert payments" 
ON payments 
FOR INSERT 
WITH CHECK (true);

-- Allow querying payments
CREATE POLICY "Allow anon select payments" 
ON payments 
FOR SELECT 
USING (true);

-- Allow updating confirmation & email status
CREATE POLICY "Allow anon update payments" 
ON payments 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- ========================================================
-- Fix 2: Group Summary View with security_invoker = true
-- (Fixes Supabase "Security Definer View" warning)
-- ========================================================
DROP VIEW IF EXISTS group_collection_summary;

CREATE VIEW group_collection_summary 
WITH (security_invoker = true) AS
SELECT 
  group_id,
  group_name,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successful_contributions,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS total_collected_inr,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_contributions,
  COUNT(*) AS total_transactions
FROM payments
GROUP BY group_id, group_name
ORDER BY group_id;
