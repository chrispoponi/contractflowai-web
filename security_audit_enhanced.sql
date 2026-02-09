-- SECURITY AUDIT - Enhanced with explicit confirmations
-- This shows clear results even when things are secure

-- ============================================
-- 1. RLS STATUS - All tables must be secured
-- ============================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ Secured'
    ELSE '❌ VULNERABLE - RLS NOT ENABLED!'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('contracts', 'users', 'teams', 'team_members', 
                    'organizations', 'feedback', 'referrals', 
                    'client_updates', 'user_subscriptions')
ORDER BY tablename;

-- ============================================
-- 2. PUBLIC ACCESS CHECK - Should be empty
-- ============================================

-- First check if any exist
DO $$
DECLARE
  public_count int;
BEGIN
  SELECT COUNT(*) INTO public_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND 'public' = ANY(roles::text[]);
    
  IF public_count > 0 THEN
    RAISE NOTICE '⚠️ WARNING: % public access policies found', public_count;
  ELSE
    RAISE NOTICE '✅ GOOD: No public access policies found';
  END IF;
END $$;

-- Show any public policies if they exist
SELECT 
  tablename,
  policyname,
  roles,
  '⚠️ WARNING: Public access detected' as alert
FROM pg_policies
WHERE schemaname = 'public'
  AND 'public' = ANY(roles::text[])
UNION ALL
SELECT 
  'No public policies' as tablename,
  'All secure' as policyname,
  ARRAY[]::text[] as roles,
  '✅ No unauthorized access' as alert
WHERE NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' 
  AND 'public' = ANY(roles::text[])
)
ORDER BY alert DESC;

-- ============================================
-- 3. POLICY COUNT PER TABLE
-- ============================================

SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO POLICIES'
    WHEN COUNT(*) < 2 THEN '⚠️ Limited protection'
    ELSE '✅ Well protected'
  END as security_level
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contracts', 'users', 'teams', 'team_members', 
                    'organizations', 'feedback', 'referrals', 
                    'client_updates', 'user_subscriptions')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. DETAILED POLICY REVIEW
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles,
  '✅ Policy active' as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 5. FINAL SUMMARY
-- ============================================

SELECT 
  '🔒 SECURITY AUDIT COMPLETE' as result,
  (SELECT COUNT(*) FROM pg_tables 
   WHERE schemaname = 'public' 
   AND rowsecurity = true
   AND tablename IN ('contracts', 'users', 'teams', 'feedback')) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE schemaname = 'public') as total_policies,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND 'public' = ANY(roles::text[])
    ) THEN '⚠️ Public access exists'
    ELSE '✅ No public access'
  END as public_access_status;
