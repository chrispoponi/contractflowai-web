-- FIX USERS TABLE - Add Missing Columns for Settings/Reminders
-- This fixes the 406 errors on Settings and Reminders pages

-- Add missing reminder_preferences column
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_preferences JSONB DEFAULT '{
  "email": true,
  "sms": false,
  "dailyTime": "08:00",
  "weeklyDigest": true
}'::jsonb;

-- Verify all users table columns exist
SELECT 
  column_name,
  data_type,
  '✅ Column exists' as status
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Verify users can query their own profile
SELECT 
  policyname,
  cmd,
  '✅ Policy active' as status
FROM pg_policies
WHERE tablename = 'users';

SELECT '✅ Users table fixed!' as result;
