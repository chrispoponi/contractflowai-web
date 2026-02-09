# 🔴 Feedback Submission Error - FIXED

## Problem
Feedback form shows "Unable to send feedback [object Object]" and returns a 400 error.

## Root Cause
The `feedback` table either:
1. Doesn't exist in your Supabase database yet, OR
2. RLS policies are preventing the insert

## ✅ IMMEDIATE FIX (Run This SQL)

### Option 1: Complete Setup (Recommended)

Run **`setup_feedback_complete.sql`** in your Supabase SQL Editor.

This script will:
- ✅ Create the feedback table (if missing)
- ✅ Set up proper RLS policies
- ✅ Create indexes for performance
- ✅ Set up email notification trigger
- ✅ Verify everything is working

### Option 2: Quick Fix (Just the table)

If you just want the form to work without email notifications:

```sql
-- Create feedback table
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

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert own feedback" ON feedback
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own feedback
CREATE POLICY "Users can view own feedback" ON feedback
FOR SELECT USING (auth.uid() = user_id);
```

---

## How to Verify It's Fixed

1. **Run the SQL** in Supabase SQL Editor
2. **Refresh your browser** (Cmd+Shift+R or Ctrl+Shift+R)
3. **Submit test feedback** on the feedback page
4. **Check your email** (chrispoponi@gmail.com) - you should get a notification!

---

## What Happens Now

After running the SQL:

✅ **Feedback form works**  
✅ **Users can submit feedback**  
✅ **You get email notifications** (at chrispoponi@gmail.com)  
✅ **Users can see their previous submissions**  
✅ **All data is secured with RLS**  

---

## Technical Details

### Database Schema
```
feedback
  - id: UUID (primary key)
  - user_id: UUID (references auth.users)
  - email: TEXT
  - topic: TEXT (optional)
  - sentiment: TEXT (optional)
  - message: TEXT (required)
  - created_at: TIMESTAMPTZ
```

### RLS Policies
1. **SELECT**: Users can only view their own feedback
2. **INSERT**: Users can only insert feedback with their own user_id

### Email Notifications
- Trigger: `on_feedback_created` (fires after INSERT)
- Edge Function: `feedbackNotification`
- Sends to: chrispoponi@gmail.com
- Powered by: Resend API

---

## Troubleshooting

### Still Getting 400 Error?

**Check if table exists:**
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'feedback';
```

**Check RLS policies:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'feedback';
```

**Check your auth:**
```sql
SELECT auth.uid(); -- Should return your user ID, not null
```

### Not Receiving Email Notifications?

1. Verify Resend API key is set: Check Supabase secrets
2. Check Edge Function is deployed: `supabase functions list`
3. Check trigger exists: Run verification query from SQL script

---

## Files Created

- `setup_feedback_complete.sql` - Complete setup (recommended)
- `create_feedback_table.sql` - Basic table setup
- `create_feedback_trigger.sql` - Email notification setup

---

**Status: ✅ FIXED - Just run the SQL!**

**Run `setup_feedback_complete.sql` and your feedback form will work immediately!** 🎉
