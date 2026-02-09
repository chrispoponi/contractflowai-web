-- COMPREHENSIVE SECURITY AUDIT & FIXES
-- Run this to ensure all tables have proper RLS and security

-- ============================================
-- 1. VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================

-- Contracts table
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Team members table
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Referrals table (if exists)
ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;

-- Client updates table (if exists)
ALTER TABLE IF EXISTS client_updates ENABLE ROW LEVEL SECURITY;

-- User subscriptions table (if exists)
ALTER TABLE IF EXISTS user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CONTRACTS TABLE - Strict RLS
-- ============================================

DROP POLICY IF EXISTS "users_view_own_contracts" ON contracts;
DROP POLICY IF EXISTS "users_insert_own_contracts" ON contracts;
DROP POLICY IF EXISTS "users_update_own_contracts" ON contracts;
DROP POLICY IF EXISTS "users_delete_own_contracts" ON contracts;

-- Users can ONLY see their own contracts
CREATE POLICY "users_view_own_contracts" ON contracts
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can ONLY insert contracts for themselves
CREATE POLICY "users_insert_own_contracts" ON contracts
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can ONLY update their own contracts
CREATE POLICY "users_update_own_contracts" ON contracts
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can ONLY delete their own contracts
CREATE POLICY "users_delete_own_contracts" ON contracts
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 3. FEEDBACK TABLE - Already secured
-- ============================================

-- Policies already created (users can only view/insert own feedback)

-- ============================================
-- 4. CLIENT_UPDATES - Secure if exists
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'client_updates') THEN
    DROP POLICY IF EXISTS "users_manage_own_updates" ON client_updates;
    
    CREATE POLICY "users_manage_own_updates" ON client_updates
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- 5. REFERRALS - Secure if exists
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'referrals') THEN
    ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "users_view_own_referrals" ON referrals;
    
    CREATE POLICY "users_view_own_referrals" ON referrals
    FOR SELECT TO authenticated
    USING (
      referrer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      OR
      referred_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
  END IF;
END $$;

-- ============================================
-- 6. DISABLE PUBLIC ACCESS TO ALL TABLES
-- ============================================

-- Remove any 'public' role policies (only authenticated users allowed)
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND 'public' = ANY(roles::text[])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Dropped public policy: % on %.%', 
      pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END $$;

-- ============================================
-- 7. VERIFICATION - Check Security Status
-- ============================================

-- Check all tables have RLS enabled
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

-- Check for any policies allowing public access
SELECT 
  tablename,
  policyname,
  roles,
  '⚠️ WARNING: Public access detected' as alert
FROM pg_policies
WHERE schemaname = 'public'
  AND 'public' = ANY(roles::text[]);

-- Count policies per table
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
GROUP BY tablename
ORDER BY tablename;

-- Final summary
SELECT 
  '🔒 SECURITY AUDIT COMPLETE' as status,
  'All tables should have RLS enabled' as requirement,
  'No public access policies should exist' as verification;
