import { ImageModel, ImageQuality } from "./generated-images";

export type AdStyle = "graphic_text" | "storefront_card" | "uniform_style" | "inside_store";
export type GenerationMode = "ai_takeover" | "custom" | "winning_variants";
export type ImageFormat = "1:1" | "9:16";
export type JobStatus = "pending" | "strategizing" | "strategy_ready" | "generating" | "completed" | "failed";

export interface FormatSplit {
  square: number;
  portrait: number;
}

export interface StrategyItem {
  index: number;
  ad_style: AdStyle;
  format: ImageFormat;
  headline: string;
  subheadline: string;
  cta: string;
  disclaimer?: string;
  prompt_direction: string;
  rationale: string;
}

export interface GenerationStrategy {
  brand_analysis: string;
  style_distribution: Partial<Record<AdStyle, number>>;
  items: StrategyItem[];
}

export interface GenerationJob {
  id: string;
  user_id: string;
  campaign_id: string | null;
  mode: GenerationMode;
  status: JobStatus;
  brand_name: string;
  model: ImageModel;
  quality: ImageQuality;
  language: string;
  total_count: number | null;
  format_split: FormatSplit;
  reference_images: string[];
  strategy: GenerationStrategy | null;
  images_requested: number;
  images_completed: number;
  images_failed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface StylePreferenceEntry {
  style: AdStyle;
  weight: number;
  enabled: boolean;
}

export interface CopyPool {
  headlines: string[];
  subheadlines: string[];
  ctas: string[];
  disclaimers: string[];
}

export interface StylePreference {
  id: string;
  user_id: string;
  campaign_id: string | null;
  styles: StylePreferenceEntry[];
  default_language: string;
  default_format_split: FormatSplit;
  copy_pool?: CopyPool;
  created_at: string;
  updated_at: string;
}

export interface CreativeBrief {
  brand_analysis: string;
  visual_direction: string;
  logo_placement_rule: string;
  composition_notes: string;
  copy_tone: string;
  recommended_angles: string;
  memory_insights: string;
  avoided_patterns: string;
}

export interface CreativeMemoryItem {
  content: string;
  memory_type: string;
  brand_name: string | null;
}

export interface CreateJobRequest {
  mode: GenerationMode;
  brand_name: string;
  campaign_id?: string;
  model: ImageModel;
  quality?: ImageQuality;
  language?: string;
  total_count?: number;
  format_split?: FormatSplit;
  reference_images?: string[];
}
