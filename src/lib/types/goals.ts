export interface RevenueGoal {
  id: string;
  user_id: string;
  month: string;

  target_revenue: number | null;
  target_profit: number | null;
  target_margin_pct: number | null;

  actual_revenue: number;
  actual_fb_spend: number;
  actual_profit: number;
  actual_margin_pct: number;

  notes: string | null;
  ai_strategy: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteMonthlyRevenue {
  id: string;
  user_id: string;
  goal_id: string | null;
  site: string;
  month: string;
  revenue: number;
  fb_spend: number;
  fb_revenue: number;
  profit: number;
  margin_pct: number;
  ad_clicks: number | null;
  ad_rpm: number | null;
  fb_cpc: number | null;
  source: "manual" | "screenshot" | "chat";
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  goal: RevenueGoal;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;

  revenueProgress: number;
  profitProgress: number;

  dailyRevenueNeeded: number;
  dailyProfitNeeded: number;

  onTrackRevenue: boolean;
  onTrackProfit: boolean;

  siteBreakdown: SiteMonthlyRevenue[];
}

export interface GoalStrategy {
  strategy_summary: string;
  pace_status: "ahead" | "on_track" | "behind" | "critical";
  daily_actions: Array<{
    priority: "high" | "medium" | "low";
    site: string;
    action: string;
    expected_impact: string;
    reasoning: string;
  }>;
  budget_allocation: Array<{
    site: string;
    current_daily_spend: number;
    recommended_daily_spend: number;
    change: "increase" | "decrease" | "maintain";
    reason: string;
  }>;
  risk_flags: Array<{
    site: string;
    issue: string;
    severity: "high" | "medium" | "low";
  }>;
  weekly_projection: {
    projected_monthly_revenue: number;
    projected_monthly_profit: number;
    projected_margin_pct: number;
    confidence: "high" | "medium" | "low";
  };
}
