-- RUN THIS NOW to fix 400 errors immediately!
-- This adds all the minimal columns the app needs

-- Add these columns if they don't exist
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS earnest_money NUMERIC;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS inspection_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS closing_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_file_url TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Verify they were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
ORDER BY ordinal_position;
