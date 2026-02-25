export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string | null;
  image_urls: string[];
  metadata: {
    extracted_change_ids?: string[];
    processing_status?: "pending" | "processing" | "complete" | "error";
    error?: string;
  };
  created_at: string;
}

export interface ChatInputMessage {
  content: string;
  images: File[];
}

export interface ExtractedChange {
  campaign_name: string;
  site?: string;
  action_type: string;
  geo: string | null;
  change_value: string | null;
  description: string;
  confidence: number;
  metrics: Record<string, number | string | undefined>;
}

export interface ExtractionResult {
  changes: ExtractedChange[];
  assistant_message: string;
}
