-- Fix all RLS policies for contracts table

-- Drop and recreate contracts policies
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;

-- View own contracts
CREATE POLICY "Users can view own contracts" ON contracts
FOR SELECT USING (
  auth.uid() = user_id
);

-- Insert own contracts
CREATE POLICY "Users can insert own contracts" ON contracts
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Update own contracts
CREATE POLICY "Users can update own contracts" ON contracts
FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- Delete own contracts (optional)
CREATE POLICY "Users can delete own contracts" ON contracts
FOR DELETE USING (
  auth.uid() = user_id
);

-- Fix storage policies
DROP POLICY IF EXISTS "Users can upload own contract files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own contract files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own contract files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own contract files" ON storage.objects;

-- Allow authenticated users to upload to their folder
CREATE POLICY "Users can upload own contract files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their files
CREATE POLICY "Users can view own contract files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their files
CREATE POLICY "Users can update own contract files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their files
CREATE POLICY "Users can delete own contract files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
