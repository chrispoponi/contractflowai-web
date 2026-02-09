-- COMPLETE DATABASE FIX - ALL TABLES
-- Fixes ALL 400/406 errors across the entire application
-- Run this once to add all missing columns

-- ============================================
-- TEAMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add missing columns if table already exists
ALTER TABLE teams ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view teams they own or are members of" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;

-- Create policies
CREATE POLICY "Users can view teams they own or are members of" ON teams
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid() OR
  id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create teams" ON teams
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams" ON teams
FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams" ON teams
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- TEAM_MEMBERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member'
);

-- Add missing columns if table already exists
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON team_members;

-- Create policies
CREATE POLICY "Users can view team members" ON team_members
FOR SELECT TO authenticated
USING (
  team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()) OR
  user_id = auth.uid()
);

CREATE POLICY "Team owners can add members" ON team_members
FOR INSERT TO authenticated
WITH CHECK (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));

CREATE POLICY "Team owners can remove members" ON team_members
FOR DELETE TO authenticated
USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add missing columns if table already exists
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their organizations" ON organizations;

-- Create policies
CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations" ON organizations
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their organizations" ON organizations
FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- USERS PROFILE TABLE (extended auth.users data)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  brokerage_name TEXT,
  role TEXT DEFAULT 'user',
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  subscription_notes TEXT,
  stripe_customer_id TEXT,
  email_notifications_enabled BOOLEAN DEFAULT true,
  reminder_inspection_days INTEGER[] DEFAULT ARRAY[7, 3, 1],
  reminder_closing_days INTEGER[] DEFAULT ARRAY[14, 7, 3, 1],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS brokerage_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_inspection_days INTEGER[] DEFAULT ARRAY[7, 3, 1];
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_closing_days INTEGER[] DEFAULT ARRAY[14, 7, 3, 1];
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create policies
CREATE POLICY "Users can view their own profile" ON users
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON users
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================
-- REFERRALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_email TEXT NOT NULL,
  referred_email TEXT,
  ref_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  reward_issued BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add missing columns
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_email TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_email TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ref_code TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_issued BOOLEAN DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- CLIENT_UPDATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS client_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  update_type TEXT NOT NULL,
  message TEXT,
  send_method TEXT,
  sent_date TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add missing columns
ALTER TABLE client_updates ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE client_updates ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE client_updates ADD COLUMN IF NOT EXISTS update_type TEXT;
ALTER TABLE client_updates ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE client_updates ADD COLUMN IF NOT EXISTS send_method TEXT;
ALTER TABLE client_updates ADD COLUMN IF NOT EXISTS sent_date TIMESTAMPTZ;
ALTER TABLE client_updates ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT false;

-- ============================================
-- CREATE ALL INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS teams_owner_id_idx ON teams(owner_id);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON team_members(user_id);
CREATE INDEX IF NOT EXISTS organizations_owner_id_idx ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS referrals_ref_code_idx ON referrals(ref_code);
CREATE INDEX IF NOT EXISTS client_updates_contract_id_idx ON client_updates(contract_id);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  'teams' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'teams'
UNION ALL
SELECT 
  'team_members',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'team_members'
UNION ALL
SELECT 
  'organizations',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'organizations'
UNION ALL
SELECT 
  'users',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'users'
UNION ALL
SELECT 
  'referrals',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'referrals'
UNION ALL
SELECT 
  'client_updates',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'client_updates';

SELECT '✅ ALL TABLES FIXED!' as status;
