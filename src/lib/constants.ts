import { ActionType } from "./types/changes";

// Temporary: default user ID until auth is implemented
export const DEFAULT_USER_ID = "0139e35f-5e5b-4e76-be0d-064ceaa842f5";

// Action color strategy (standard colors, clean usage):
// Green  — Growth actions (increase, resume, new, clone): emerald-700 / emerald-50
// Yellow — Caution actions (decrease, bid, budget): amber-700 / amber-50
// Grey   — Stop actions (pause): slate-600 / slate-100
// Blue   — Modify actions (creative, audience): brand blue #366ae8
// Slate  — Other: slate-500 / slate-50
export const ACTION_TYPE_CONFIG: Record<
  ActionType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  increase_spend: {
    label: "Increase Spend",
    icon: "trending-up",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  decrease_spend: {
    label: "Decrease Spend",
    icon: "trending-down",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
  },
  pause_campaign: {
    label: "Pause Campaign",
    icon: "pause",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  pause_geo: {
    label: "Pause Geo",
    icon: "map-pin-off",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  resume_campaign: {
    label: "Resume Campaign",
    icon: "play",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  resume_geo: {
    label: "Resume Geo",
    icon: "map-pin",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  clone_campaign: {
    label: "Clone Campaign",
    icon: "copy",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  new_campaign: {
    label: "New Campaign",
    icon: "plus-circle",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  creative_change: {
    label: "Creative Change",
    icon: "pen-tool",
    color: "text-[#366ae8]",
    bgColor: "bg-[#366ae8]/10",
  },
  bid_change: {
    label: "Bid Change",
    icon: "dollar-sign",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
  },
  audience_change: {
    label: "Audience Change",
    icon: "users",
    color: "text-[#366ae8]",
    bgColor: "bg-[#366ae8]/10",
  },
  budget_change: {
    label: "Budget Change",
    icon: "wallet",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
  },
  other: {
    label: "Other",
    icon: "circle-dot",
    color: "text-slate-500",
    bgColor: "bg-slate-50",
  },
};

// Verdict colors:
// Green  — Positive: good result
// Red    — Negative: bad result (rose for cleaner look)
// Grey   — Neutral: no change
// Yellow — Inconclusive: not enough data
export const VERDICT_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  positive: {
    label: "Positive",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  negative: {
    label: "Negative",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
  },
  neutral: {
    label: "Neutral",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
  },
  inconclusive: {
    label: "Inconclusive",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
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
