export interface GeneratedVideo {
  id: string;
  user_id: string;
  campaign_id: string | null;
  video_url: string;
  thumbnail_url: string | null;
  prompt: string;
  model: string;
  aspect_ratio: string;
  duration_seconds: number;
  video_ad_style: string | null;
  headline_ref: string | null;
  subheadline_ref: string | null;
  cta_text: string | null;
  language: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  metadata: Record<string, unknown>;
  job_id: string | null;
  generation_index: number | null;
  created_at: string;
}
