-- DIAGNOSTIC: Check if feedback table is set up correctly
-- Run this to see what's wrong with your feedback table

-- 1. Does the table exist?
SELECT 
  table_name,
  'Table exists!' as status
FROM information_schema.tables 
WHERE table_name = 'feedback';

-- 2. What columns does it have?
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'feedback'
ORDER BY ordinal_position;

-- 3. Is RLS enabled?
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'feedback';

-- 4. What policies exist?
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'feedback';

-- 5. Can you see your user ID?
SELECT auth.uid() as your_user_id;

-- 6. Try a test insert (this will show the actual error)
-- Replace 'your-user-id' with the UUID from query 5 above
-- INSERT INTO feedback (user_id, email, topic, sentiment, message)
-- VALUES (auth.uid(), 'test@test.com', 'Test', 'Good', 'Test message');
