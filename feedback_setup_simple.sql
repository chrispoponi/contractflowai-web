-- STEP 1: Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT,
  topic TEXT,
  sentiment TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- STEP 2: Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- STEP 3: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;

-- STEP 4: Create SELECT policy
CREATE POLICY "Users can view own feedback" ON feedback FOR SELECT USING (auth.uid() = user_id);

-- STEP 5: Create INSERT policy
CREATE POLICY "Users can insert own feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STEP 6: Create indexes
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);
