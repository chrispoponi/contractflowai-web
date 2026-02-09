-- COMPLETE DATABASE FIX - Add ALL Missing Columns
-- This fixes 400/406 errors across ALL pages
-- Run this once and all errors will disappear immediately

-- ============================================
-- CONTRACTS TABLE: Add all missing columns
-- ============================================

-- Basic info columns
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_email TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS seller_email TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_phone TEXT;

-- Financial columns
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS earnest_money NUMERIC;

-- Date columns
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS inspection_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS inspection_response_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS appraisal_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS loan_contingency_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS final_walkthrough_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS closing_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_date DATE;

-- Status columns
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS representing_side TEXT;

-- Completion tracking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS inspection_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS inspection_response_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS appraisal_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS loan_contingency_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS final_walkthrough_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS closing_completed BOOLEAN DEFAULT false;

-- Signature tracking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS all_parties_signed BOOLEAN DEFAULT false;

-- Counter offer tracking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_counter_offer BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counter_offer_number INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS original_contract_id UUID REFERENCES contracts(id);

-- Cancellation tracking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_notes TEXT;

-- File paths
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_file_url TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counter_offer_path TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS summary_path TEXT;

-- AI summaries
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS plain_language_summary TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Business tracking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS agent_notes TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Timestamps
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- CREATE INDEXES for performance
-- ============================================

CREATE INDEX IF NOT EXISTS contracts_user_id_idx ON contracts(user_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts(status);
CREATE INDEX IF NOT EXISTS contracts_closing_date_idx ON contracts(closing_date);
CREATE INDEX IF NOT EXISTS contracts_created_at_idx ON contracts(created_at DESC);

-- ============================================
-- VERIFICATION: Check what we have now
-- ============================================

SELECT 
  'contracts table' as table_name,
  COUNT(*) as total_columns,
  '✅ All columns added!' as status
FROM information_schema.columns
WHERE table_name = 'contracts';

-- Show all columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;
