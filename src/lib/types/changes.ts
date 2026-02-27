export type ActionType =
  | "increase_spend"
  | "decrease_spend"
  | "pause_campaign"
  | "pause_geo"
  | "resume_campaign"
  | "resume_geo"
  | "clone_campaign"
  | "new_campaign"
  | "creative_change"
  | "bid_change"
  | "audience_change"
  | "budget_change"
  | "other";

export type ImpactVerdict =
  | "positive"
  | "negative"
  | "neutral"
  | "inconclusive";

export interface CampaignMetrics {
  // Facebook / Cost side
  fb_spend?: number;
  fb_revenue?: number;
  fb_cpc?: number;
  fb_cpm?: number;
  fb_ctr?: number;
  fb_leads?: number;
  fb_clicks?: number;
  fb_impressions?: number;
  fb_margin_pct?: number;
  fb_daily_budget?: number;

  // AdSense / Revenue side
  ad_revenue?: number;
  ad_clicks?: number;
  ad_ctr?: number;
  ad_cpc?: number;
  ad_rpm?: number;
  ad_impressions?: number;
  ad_page_views?: number;

  // Profitability
  gross_profit?: number;
  margin_pct?: number;
  roi?: number;
  roas?: number;

  // Context
  time_range?: string;
  source_date?: string;
}

export type ChangeStatus = "active" | "voided";

export interface Change {
  id: string;
  user_id: string;
  campaign_id: string | null;
  chat_message_id: string | null;
  action_type: ActionType;
  campaign_name: string;
  site?: string;
  geo: string | null;
  change_value: string | null;
  description: string | null;
  confidence: number;
  pre_metrics: CampaignMetrics;
  post_metrics: CampaignMetrics;
  change_date: string;
  metrics_time_range: string | null;
  impact_review_due: string | null;
  impact_reviewed_at: string | null;
  impact_summary: string | null;
  impact_verdict: ImpactVerdict | null;
  status: ChangeStatus;
  void_reason: string | null;
  tags: string[];
  test_category?: string | null;
  hypothesis?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  site: string | null;
  platform: string;
  status: "active" | "paused" | "archived";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailySnapshot {
  id: string;
  user_id: string;
  campaign_id: string | null;
  campaign_name: string;
  site: string | null;
  snapshot_date: string;
  metrics: CampaignMetrics;
  source: "manual" | "screenshot" | "chat";
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  report_type: "daily" | "weekly" | "custom";
  period_start: string;
  period_end: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
