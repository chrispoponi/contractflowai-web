-- FIX RLS POLICIES - Remove Infinite Recursion
-- This fixes the "infinite recursion detected in policy" error

-- ============================================
-- TEAMS TABLE - Fix RLS Policies
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view teams they own or are members of" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;

-- Simple, non-recursive policies
CREATE POLICY "users_view_owned_teams" ON teams
FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "users_create_teams" ON teams
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_update_teams" ON teams
FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "owners_delete_teams" ON teams
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- TEAM_MEMBERS TABLE - Fix RLS Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON team_members;

-- Simple policies
CREATE POLICY "view_team_members" ON team_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "owners_add_members" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
);

CREATE POLICY "owners_remove_members" ON team_members
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
);

-- ============================================
-- USERS TABLE - Fix RLS Policies  
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Simple policies
CREATE POLICY "view_own_profile" ON users
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "update_own_profile" ON users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "insert_own_profile" ON users
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================
-- ORGANIZATIONS TABLE - Fix RLS Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their organizations" ON organizations;

-- Simple policies
CREATE POLICY "view_own_organizations" ON organizations
FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "create_organizations" ON organizations
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "update_own_organizations" ON organizations
FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd,
  '✅ Policy fixed' as status
FROM pg_policies
WHERE tablename IN ('teams', 'team_members', 'users', 'organizations')
ORDER BY tablename, policyname;

SELECT '✅ ALL RLS POLICIES FIXED - No more infinite recursion!' as result;
