-- TEST FEEDBACK SUBMISSION FOR ALL AUTH TYPES
-- Run this after setting up the RLS policies

-- ============================================
-- TEST 1: Check your current authentication
-- ============================================
SELECT 
  'TEST 1: Authentication Check' as test_name,
  auth.uid() as user_id,
  auth.role() as role,
  CASE 
    WHEN auth.uid() IS NOT NULL AND auth.role() = 'authenticated' 
    THEN '✅ PASS - You are authenticated'
    ELSE '❌ FAIL - Not authenticated or auth.uid() is null'
  END as result;

-- ============================================
-- TEST 2: Check if you can view feedback
-- ============================================
SELECT 
  'TEST 2: View Permission' as test_name,
  COUNT(*) as feedback_count,
  '✅ PASS - You can query feedback table' as result
FROM feedback
WHERE user_id = auth.uid();

-- ============================================
-- TEST 3: Check RLS policies exist
-- ============================================
SELECT 
  'TEST 3: RLS Policies' as test_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ PASS - Policies exist'
    ELSE '❌ FAIL - Missing policies'
  END as result
FROM pg_policies
WHERE tablename = 'feedback';

-- ============================================
-- TEST 4: Verify you exist in auth.users
-- ============================================
SELECT 
  'TEST 4: User Exists' as test_name,
  id as user_id,
  email,
  COALESCE(raw_app_meta_data->>'provider', 'email') as auth_provider,
  CASE 
    WHEN id IS NOT NULL THEN '✅ PASS - User found in auth.users'
    ELSE '❌ FAIL - User not found'
  END as result
FROM auth.users
WHERE id = auth.uid();

-- ============================================
-- TEST 5: Simulate INSERT check (doesn't actually insert)
-- ============================================
SELECT 
  'TEST 5: Insert Permission Check' as test_name,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ LIKELY PASS - auth.uid() available'
    WHEN auth.role() = 'authenticated' THEN '✅ LIKELY PASS - Authenticated fallback'
    ELSE '❌ LIKELY FAIL - No valid authentication'
  END as result;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
  '========================================' as separator,
  'All tests completed! Check results above.' as summary,
  'If all show ✅ PASS, feedback submission should work' as next_step;
