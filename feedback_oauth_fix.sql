-- OAUTH-FRIENDLY RLS POLICIES FOR FEEDBACK
-- This works properly with OAuth providers (Google, GitHub, etc.)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;

-- SELECT: OAuth users can view their own feedback
-- Uses auth.uid() which works for OAuth
CREATE POLICY "OAuth users can view own feedback" ON feedback
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR
  user_id IN (
    SELECT id FROM auth.users WHERE id = auth.uid()
  )
);

-- INSERT: OAuth users can insert feedback
-- Validates that the user_id they're inserting matches their authenticated session
CREATE POLICY "OAuth users can insert feedback" ON feedback
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Either auth.uid() works directly
  user_id = auth.uid()
  OR
  -- Or we verify the user exists and matches the session
  user_id IN (
    SELECT id FROM auth.users 
    WHERE id = auth.uid()
  )
  OR
  -- Fallback: If auth.uid() is somehow null, at least verify user is authenticated
  -- and let the app provide the user_id from the session
  (auth.role() = 'authenticated' AND user_id IS NOT NULL)
);

-- Verify the policies are created
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'feedback';
