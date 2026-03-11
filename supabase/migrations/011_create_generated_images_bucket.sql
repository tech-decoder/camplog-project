-- Storage bucket for generated ad images
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload generated images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view generated images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

CREATE POLICY "Authenticated users can delete own generated images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generated-images' AND auth.role() = 'authenticated');
