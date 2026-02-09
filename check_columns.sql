-- Check what columns actually exist in contracts table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contracts'
ORDER BY ordinal_position;
