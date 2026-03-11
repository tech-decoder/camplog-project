-- Private storage bucket for winning ad reference images
INSERT INTO storage.buckets (id, name, public) VALUES ('reference-images', 'reference-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload reference images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reference-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view own reference images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reference-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own reference images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'reference-images' AND auth.role() = 'authenticated');
