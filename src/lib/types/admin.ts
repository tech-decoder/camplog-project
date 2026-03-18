export type GoalStatus = "on_track" | "behind" | "ahead" | "no_goal";

export interface TeamMemberStats {
  // Identity
  id:          string;
  email:       string;
  full_name:   string | null;
  nickname:    string | null;
  avatar_url:  string | null;

  // Sites
  site_count:  number;
  sites:       string[]; // abbreviations e.g. ["MBM", "GXP"]

  // Current month goal actuals (null = no goal set this month)
  actual_revenue:    number | null;
  actual_profit:     number | null;
  actual_margin_pct: number | null;
  actual_fb_spend:   number | null;

  // Targets
  target_revenue: number | null;
  target_profit:  number | null;

  // Goal pace
  goal_status: GoalStatus;

  // Activity
  changes_this_month: number;
  open_tasks:         number; // todo + in_progress
}

export interface TeamOverview {
  month:          string; // "YYYY-MM"
  members:        TeamMemberStats[];
  total_revenue:  number;
  total_profit:   number;
  total_fb_spend: number;
}
