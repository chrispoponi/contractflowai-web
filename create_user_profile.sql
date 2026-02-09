-- CREATE YOUR USER PROFILE (if it doesn't exist)
-- This ensures you have a row in the users table

-- Check if you have a profile
SELECT 
  id,
  email,
  full_name,
  'Profile exists' as status
FROM users
WHERE id = auth.uid();

-- If no results above, run this to create your profile:
-- (Replace the values with your actual info if you want)

INSERT INTO users (id, email, email_notifications_enabled, reminder_preferences)
SELECT 
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  true,
  '{
    "email": true,
    "sms": false,
    "dailyTime": "08:00",
    "weeklyDigest": true
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid()
);

-- Verify it was created
SELECT 
  id,
  email,
  email_notifications_enabled,
  reminder_preferences,
  '✅ Profile ready' as status
FROM users
WHERE id = auth.uid();
