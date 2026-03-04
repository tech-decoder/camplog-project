export type AdCopyFieldType = "headline" | "primary_text" | "description";

export interface AdCopyVariant {
  id: string;
  user_id: string;
  campaign_id: string;
  field_type: AdCopyFieldType;
  content: string;
  sort_order: number;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
