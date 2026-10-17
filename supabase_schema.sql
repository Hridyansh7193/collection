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
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  razorpay_payment_id TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Fast Indexing for group tracking and status searches
CREATE INDEX IF NOT EXISTS idx_payments_group ON payments(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- View for group-by-group summary
CREATE OR REPLACE VIEW group_collection_summary AS
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
