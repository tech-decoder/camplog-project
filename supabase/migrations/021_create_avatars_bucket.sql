INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Service role full access on avatars"
  ON storage.objects FOR ALL
  USING (bucket_id = 'avatars' AND auth.role() = 'service_role');
