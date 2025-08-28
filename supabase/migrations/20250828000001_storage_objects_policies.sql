/***** 
WARNING: it is used in bucket through direct command and options not in sql editor because of key policy constraint 
so if you want to use it in sql editor you need to apply the policy , modify the commands accordingly :)

*******/

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  ((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text) AND (name ~~ (('avatars/'::text || (auth.uid())::text) || '-%'::text)))
);

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (
 ((bucket_id = 'avatars'::text) AND (name ~~ 'avatars/%'::text))
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  ((bucket_id = 'avatars'::text) AND (name ~~ (('avatars/'::text || (auth.uid())::text) || '-%'::text)))
) WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = substring(name from 'avatars/([^-]+)')
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  ((bucket_id = 'avatars'::text) AND (name ~~ (('avatars/'::text || (auth.uid())::text) || '-%'::text)))
);
