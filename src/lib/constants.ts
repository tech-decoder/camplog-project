import { ActionType } from "./types/changes";

// Temporary: default user ID until auth is implemented
export const DEFAULT_USER_ID = "0139e35f-5e5b-4e76-be0d-064ceaa842f5";

// Action color strategy (semantic tokens for light/dark support):
// Green  — Growth actions (increase, resume, new, clone)
// Yellow — Caution actions (decrease, bid, budget)
// Grey   — Stop actions (pause)
// Blue   — Modify actions (creative, audience): primary
// Slate  — Other
export const ACTION_TYPE_CONFIG: Record<
  ActionType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  increase_spend: {
    label: "Increase Spend",
    icon: "trending-up",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  decrease_spend: {
    label: "Decrease Spend",
    icon: "trending-down",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  pause_campaign: {
    label: "Pause Campaign",
    icon: "pause",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  pause_geo: {
    label: "Pause Geo",
    icon: "map-pin-off",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  resume_campaign: {
    label: "Resume Campaign",
    icon: "play",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  resume_geo: {
    label: "Resume Geo",
    icon: "map-pin",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  clone_campaign: {
    label: "Clone Campaign",
    icon: "copy",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  new_campaign: {
    label: "New Campaign",
    icon: "plus-circle",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  creative_change: {
    label: "Creative Change",
    icon: "pen-tool",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  bid_change: {
    label: "Bid Change",
    icon: "dollar-sign",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  audience_change: {
    label: "Audience Change",
    icon: "users",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  budget_change: {
    label: "Budget Change",
    icon: "wallet",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  other: {
    label: "Other",
    icon: "circle-dot",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
  },
};

// Verdict colors:
// Green  — Positive: good result
// Red    — Negative: bad result
// Grey   — Neutral: no change
// Yellow — Inconclusive: not enough data
export const VERDICT_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  positive: {
    label: "Positive",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  negative: {
    label: "Negative",
    color: "text-rose-700 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
  },
  neutral: {
    label: "Neutral",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  inconclusive: {
    label: "Inconclusive",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
};

export const METRIC_LABELS: Record<
  string,
  { label: string; unit: string; higherIsBetter: boolean }
> = {
  fb_spend: { label: "FB Spend", unit: "$", higherIsBetter: false },
  fb_revenue: { label: "FB Revenue", unit: "$", higherIsBetter: false },
  fb_cpc: { label: "FB CPC", unit: "$", higherIsBetter: false },
  fb_cpm: { label: "FB CPM", unit: "$", higherIsBetter: false },
  fb_ctr: { label: "FB CTR", unit: "%", higherIsBetter: true },
  fb_leads: { label: "FB Leads", unit: "#", higherIsBetter: true },
  fb_clicks: { label: "FB Clicks", unit: "#", higherIsBetter: true },
  fb_margin_pct: { label: "FB Margin", unit: "%", higherIsBetter: true },
  fb_daily_budget: { label: "FB Budget", unit: "$", higherIsBetter: false },
  ad_revenue: { label: "Revenue", unit: "$", higherIsBetter: true },
  ad_clicks: { label: "AD Clicks", unit: "#", higherIsBetter: true },
  ad_ctr: { label: "AD CTR", unit: "%", higherIsBetter: true },
  ad_cpc: { label: "AD CPC", unit: "$", higherIsBetter: true },
  ad_rpm: { label: "AD RPM", unit: "$", higherIsBetter: true },
  gross_profit: { label: "Gross", unit: "$", higherIsBetter: true },
  margin_pct: { label: "Margin", unit: "%", higherIsBetter: true },
  roi: { label: "ROI", unit: "%", higherIsBetter: true },
  roas: { label: "ROAS", unit: "x", higherIsBetter: true },
};

export const IMPACT_REVIEW_DAYS = 3;

export const TEST_CATEGORIES: Record<
  string,
  { label: string; color: string; bgColor: string; description: string }
> = {
  creative_format: {
    label: "Creative Format",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Testing video format, aspect ratio, image vs video, etc.",
  },
  copy_length: {
    label: "Copy Length",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Testing primary text length, headline variations, etc.",
  },
  targeting: {
    label: "Targeting",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Testing audiences, interests, lookalikes, broad vs narrow, etc.",
  },
  bid_strategy: {
    label: "Bid Strategy",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Testing bid caps, cost caps, lowest cost, etc.",
  },
  landing_page: {
    label: "Landing Page",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Testing different landing pages, article layouts, etc.",
  },
  other: {
    label: "Other Test",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Other types of tests",
  },
};

export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: "Active",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  voided: {
    label: "Voided",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};
