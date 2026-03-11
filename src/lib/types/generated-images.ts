export type ImageModel = "gpt-image-1" | "imagen-3" | "gemini-flash-image" | "gemini-pro-image";
export type ImageQuality = "draft" | "standard" | "premium";
export type StylePreset = "modern" | "minimal" | "bold" | "lifestyle" | "product";

export interface GeneratedImage {
  id: string;
  user_id: string;
  campaign_id: string;
  image_url: string;
  thumbnail_url: string | null;
  prompt: string;
  model: ImageModel;
  quality: ImageQuality;
  style_preset: string | null;
  dimensions: string;
  headline_ref: string | null;
  primary_text_ref: string | null;
  metadata: Record<string, unknown>;
  status: "pending" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  // New fields from migration 014
  job_id: string | null;
  ad_style: string | null;
  cta_text: string | null;
  subheadline: string | null;
  language: string | null;
  generation_index: number | null;
}

export interface GenerateImageRequest {
  headline?: string;
  primary_text?: string;
  description?: string;
  style_preset?: StylePreset;
  model?: ImageModel;
  quality?: ImageQuality;
  custom_instructions?: string;
  count?: number;
}
