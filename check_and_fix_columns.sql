-- STEP 1: Check what columns currently exist in your contracts table
-- Run this first to see what you have

SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contracts'
ORDER BY ordinal_position;

-- Expected MINIMAL columns (these MUST exist for the app to work):
-- 1. id (uuid)
-- 2. user_id (uuid)
-- 3. title (text)
-- 4. property_address (text)
-- 5. buyer_name (text)
-- 6. seller_name (text)
-- 7. purchase_price (numeric/integer)
-- 8. earnest_money (numeric/integer)
-- 9. contract_date (date/timestamp)
-- 10. inspection_date (date/timestamp)
-- 11. closing_date (date/timestamp)
-- 12. status (text)
-- 13. contract_file_url (text)
-- 14. created_at (timestamp)
-- 15. updated_at (timestamp)

-- If any of the above are MISSING, you need to add them!
-- The 400 errors mean one or more of these columns don't exist.

-- STEP 2: If columns are missing, uncomment and run this:

-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS title TEXT;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS property_address TEXT;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_name TEXT;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS seller_name TEXT;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS earnest_money NUMERIC;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date DATE;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS inspection_date DATE;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS closing_date DATE;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_file_url TEXT;
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
-- ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
