-- STEP 1: Enable pg_net extension for email notifications
-- Run this first

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify it's enabled
SELECT 
  extname,
  extversion,
  '✅ Extension enabled' as status
FROM pg_extension
WHERE extname = 'pg_net';
