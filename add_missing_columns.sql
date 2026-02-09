-- Add all missing columns to contracts table for full functionality

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_email TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS seller_email TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS representing_side TEXT;

-- Completion tracking for deadlines
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS inspection_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS inspection_response_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS appraisal_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS loan_contingency_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS final_walkthrough_completed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS closing_completed BOOLEAN DEFAULT false;

-- Contract signature tracking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS all_parties_signed BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_date DATE;

-- Cancellation tracking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_notes TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_date DATE;

-- File paths
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counter_offer_path TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS summary_path TEXT;

-- Referral tracking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Agent notes
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS agent_notes TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_name TEXT;
