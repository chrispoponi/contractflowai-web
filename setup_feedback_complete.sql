-- COMPLETE FEEDBACK SYSTEM SETUP
-- Run this entire script to fix feedback submission errors

-- ===========================================
-- STEP 1: Create feedback table
-- ===========================================

-- Drop existing table if you want to start fresh (CAUTION: deletes data!)
-- DROP TABLE IF EXISTS feedback CASCADE;

CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT,
  topic TEXT,
  sentiment TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- STEP 2: Enable RLS and create policies
-- ===========================================

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON feedback
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON feedback
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- STEP 3: Create indexes for performance
-- ===========================================

CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);

-- ===========================================
-- STEP 4: Set up email notification trigger
-- ===========================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_feedback_created ON feedback;
DROP FUNCTION IF EXISTS send_feedback_notification();

-- Create function that calls the Edge Function
CREATE OR REPLACE FUNCTION send_feedback_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Supabase Edge Function asynchronously
  PERFORM
    net.http_post(
      url := 'https://uehjpftyvycbrketwhwg.supabase.co/functions/v1/feedbackNotification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after insert
CREATE TRIGGER on_feedback_created
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION send_feedback_notification();

-- ===========================================
-- STEP 5: Verify setup
-- ===========================================

-- Check if table exists
SELECT 
  'feedback table exists' AS status,
  COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'feedback';

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'feedback';

-- Check policies exist
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'feedback';

-- Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_feedback_created';

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

SELECT 
  '✅ Feedback system setup complete!' AS message,
  'Try submitting feedback now - it should work!' AS next_step;
