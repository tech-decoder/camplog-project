import { ActionType } from "./types/changes";

// Temporary: default user ID until auth is implemented
export const DEFAULT_USER_ID = "0139e35f-5e5b-4e76-be0d-064ceaa842f5";

export const ACTION_TYPE_CONFIG: Record<
  ActionType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  increase_spend: {
    label: "Increase Spend",
    icon: "trending-up",
    color: "text-[#366ae8]",
    bgColor: "bg-[#366ae8]/8",
  },
  decrease_spend: {
    label: "Decrease Spend",
    icon: "trending-down",
    color: "text-[#366ae8]/80",
    bgColor: "bg-[#366ae8]/5",
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
    color: "text-[#366ae8]",
    bgColor: "bg-[#366ae8]/8",
  },
  resume_geo: {
    label: "Resume Geo",
    icon: "map-pin",
    color: "text-[#366ae8]",
    bgColor: "bg-[#366ae8]/8",
  },
  clone_campaign: {
    label: "Clone Campaign",
    icon: "copy",
    color: "text-[#366ae8]",
    bgColor: "bg-[#366ae8]/8",
  },
  new_campaign: {
    label: "New Campaign",
    icon: "plus-circle",
    color: "text-[#366ae8]",
    bgColor: "bg-[#366ae8]/8",
  },
  creative_change: {
    label: "Creative Change",
    icon: "pen-tool",
    color: "text-[#366ae8]/80",
    bgColor: "bg-[#366ae8]/5",
  },
  bid_change: {
    label: "Bid Change",
    icon: "dollar-sign",
    color: "text-[#366ae8]/80",
    bgColor: "bg-[#366ae8]/5",
  },
  audience_change: {
    label: "Audience Change",
    icon: "users",
    color: "text-[#366ae8]/80",
    bgColor: "bg-[#366ae8]/5",
  },
  budget_change: {
    label: "Budget Change",
    icon: "wallet",
    color: "text-[#366ae8]/80",
    bgColor: "bg-[#366ae8]/5",
  },
  other: {
    label: "Other",
    icon: "circle-dot",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
};

export const VERDICT_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  positive: {
    label: "Positive",
    color: "text-[#366ae8]",
    bgColor: "bg-[#366ae8]/8",
  },
  negative: {
    label: "Negative",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  neutral: {
    label: "Neutral",
    color: "text-slate-500",
    bgColor: "bg-slate-50",
  },
  inconclusive: {
    label: "Inconclusive",
    color: "text-slate-500",
    bgColor: "bg-slate-50",
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
