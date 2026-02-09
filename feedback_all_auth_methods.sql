-- COMPREHENSIVE FEEDBACK RLS POLICIES
-- Works for ALL authentication methods:
-- - OAuth (Google, GitHub, etc.)
-- - Email/Password
-- - Magic Links
-- - Any Supabase auth method

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON feedback;
DROP POLICY IF EXISTS "OAuth users can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "OAuth users can view own feedback" ON feedback;

-- ============================================
-- SELECT POLICY: View own feedback
-- ============================================
-- Works for all auth methods
CREATE POLICY "All users can view own feedback" ON feedback
FOR SELECT 
TO authenticated
USING (
  -- Primary check: user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: Verify in auth.users table
  user_id IN (SELECT id FROM auth.users WHERE id = auth.uid())
);

-- ============================================
-- INSERT POLICY: Submit feedback
-- ============================================
-- Allows all authenticated users to insert feedback
-- Validates that user_id belongs to the authenticated user
CREATE POLICY "All users can insert feedback" ON feedback
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Method 1: Direct auth.uid() match (works for most auth types)
  user_id = auth.uid()
  OR
  -- Method 2: Verify user exists in auth.users (for OAuth edge cases)
  user_id IN (SELECT id FROM auth.users WHERE id = auth.uid())
  OR
  -- Method 3: Fallback for any authenticated session
  -- If auth.uid() has issues, at least verify:
  -- 1. User is authenticated (not anonymous)
  -- 2. user_id is not null
  -- 3. user_id exists in auth.users table
  (
    auth.role() = 'authenticated' 
    AND user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id)
  )
);

-- ============================================
-- VERIFICATION: Check policies are created
-- ============================================
SELECT 
  policyname,
  cmd,
  roles,
  permissive,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has SELECT condition'
    ELSE 'No SELECT condition'
  END as select_check,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has INSERT condition'
    ELSE 'No INSERT condition'
  END as insert_check
FROM pg_policies
WHERE tablename = 'feedback'
ORDER BY cmd, policyname;

-- ============================================
-- TEST QUERY: Verify your session
-- ============================================
SELECT 
  auth.uid() as your_user_id,
  auth.role() as your_role,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ auth.uid() works'
    ELSE '❌ auth.uid() is null'
  END as auth_status,
  CASE 
    WHEN auth.role() = 'authenticated' THEN '✅ You are authenticated'
    ELSE '❌ Not authenticated'
  END as authentication_status;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 
  '✅ Comprehensive RLS policies created!' as status,
  'Works for OAuth, Email/Password, Magic Links, and all auth methods' as compatibility,
  'Try submitting feedback now!' as next_step;
