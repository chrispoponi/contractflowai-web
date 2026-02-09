-- Enable RLS on contracts table
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;

-- Allow users to SELECT their own contracts
CREATE POLICY "Users can view own contracts" ON contracts
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to INSERT their own contracts
CREATE POLICY "Users can insert own contracts" ON contracts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own contracts
CREATE POLICY "Users can update own contracts" ON contracts
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own contracts
CREATE POLICY "Users can delete own contracts" ON contracts
FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on storage.objects for contract files
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload own contract files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own contract files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own contract files" ON storage.objects;

-- Allow users to upload to their own folder
CREATE POLICY "Users can upload own contract files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Users can view own contract files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own contract files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
