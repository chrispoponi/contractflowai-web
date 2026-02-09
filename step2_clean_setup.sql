-- STEP 2: COMPLETE FEEDBACK SETUP (Clean Version)
-- This drops existing policies first, then creates fresh ones

-- Drop ALL possible existing policies (from any previous attempts)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "authenticated_users_view_own_feedback" ON feedback;
  DROP POLICY IF EXISTS "authenticated_users_insert_feedback" ON feedback;
  DROP POLICY IF EXISTS "All users can view own feedback" ON feedback;
  DROP POLICY IF EXISTS "All users can insert feedback" ON feedback;
  DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
  DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON feedback;
  DROP POLICY IF EXISTS "OAuth users can insert feedback" ON feedback;
  DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
  DROP POLICY IF EXISTS "OAuth users can view own feedback" ON feedback;
END $$;

-- Create table (if not exists)
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT,
  topic TEXT,
  sentiment TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create simple, secure policies
CREATE POLICY "authenticated_users_view_own_feedback" ON feedback
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "authenticated_users_insert_feedback" ON feedback
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);

-- Verify setup
SELECT 
  'feedback table' as object,
  COUNT(*) as policy_count,
  '✅ Setup complete' as status
FROM pg_policies
WHERE tablename = 'feedback';
