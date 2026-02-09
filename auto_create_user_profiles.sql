-- AUTO-CREATE USER PROFILES WITH TRIGGER
-- This automatically creates a user profile when someone signs up

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    email_notifications_enabled,
    reminder_preferences,
    subscription_tier,
    subscription_status,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    true,
    '{
      "email": true,
      "sms": false,
      "dailyTime": "08:00",
      "weeklyDigest": true
    }'::jsonb,
    'free',
    'active',
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- MANUALLY CREATE PROFILE FOR EXISTING USERS
-- ============================================

-- Step 1: Find your user ID
SELECT 
  id,
  email,
  created_at,
  'Copy this ID ↑' as note
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Insert profile manually (replace YOUR_USER_ID_HERE with the ID from above)
-- Uncomment and run this after copying your ID:

/*
INSERT INTO users (
  id,
  email,
  email_notifications_enabled,
  reminder_preferences,
  subscription_tier,
  subscription_status,
  role
)
VALUES (
  'YOUR_USER_ID_HERE'::uuid,  -- ← Replace with your actual user ID
  'chrispoponi@gmail.com',     -- ← Your email
  true,
  '{
    "email": true,
    "sms": false,
    "dailyTime": "08:00",
    "weeklyDigest": true
  }'::jsonb,
  'free',
  'active',
  'user'
)
ON CONFLICT (id) DO NOTHING;
*/

-- Step 3: Verify it was created
SELECT 
  id,
  email,
  subscription_tier,
  reminder_preferences,
  '✅ Profile created' as status
FROM users
LIMIT 5;
