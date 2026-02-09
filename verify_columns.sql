-- Verify which columns exist in the contracts table
-- Run this in Supabase SQL Editor to see what columns are actually present

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contracts'
ORDER BY ordinal_position;
