-- FIXED RLS POLICIES - NO auth.users QUERIES
-- This fixes "permission denied for table users" error

-- Drop all existing policies
DROP POLICY IF EXISTS "All users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "All users can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON feedback;
DROP POLICY IF EXISTS "OAuth users can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "OAuth users can view own feedback" ON feedback;

-- ============================================
-- SELECT POLICY: Simple and secure
-- ============================================
CREATE POLICY "authenticated_users_view_own_feedback" ON feedback
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- INSERT POLICY: Simple and secure
-- ============================================
-- Only validates auth.uid() matches user_id
-- No querying auth.users table (which causes permission denied)
CREATE POLICY "authenticated_users_insert_feedback" ON feedback
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Simple: user_id must match their authenticated session
  user_id = auth.uid()
);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  policyname,
  cmd,
  '✅ Policy created' as status
FROM pg_policies
WHERE tablename = 'feedback'
ORDER BY cmd, policyname;

SELECT 
  '✅ Fixed! Policies no longer query auth.users table' as message,
  'Try submitting feedback now!' as next_step;
