-- Allow generated images without a campaign (standalone generation)
ALTER TABLE generated_images ALTER COLUMN campaign_id DROP NOT NULL;
