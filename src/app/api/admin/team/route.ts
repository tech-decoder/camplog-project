import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { TeamMemberStats, TeamOverview, GoalStatus } from "@/lib/types/admin";
import { format, startOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Verify the requester is an admin
  const { data: requester } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (!requester?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  // Determine target month (default: current month)
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? format(new Date(), "yyyy-MM");
  // revenue_goals.month is a DATE column — must use full date "YYYY-MM-01"
  const monthStart = `${month}-01`;

  // Compute next month start for changes date range
  const [year, mon] = month.split("-").map(Number);
  const nextMonth = mon === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(mon + 1).padStart(2, "0")}-01`;

  // ── 6 parallel data fetches ───────────────────────────────────────────────
  const [
    { data: profiles },
    { data: userSites },
    { data: goals },
    { data: siteRevenues },
    { data: changes },
    { data: tasks },
  ] = await Promise.all([
    // Exclude dev/test account
    supabase
      .from("profiles")
      .select("id, email, full_name, nickname, avatar_url")
      .neq("email", "bill@camplog.dev")
      .order("created_at", { ascending: true }),

    supabase
      .from("user_sites")
      .select("user_id, site_abbreviation"),

    // Fix: query with full date "YYYY-MM-01" to match DATE column type
    supabase
      .from("revenue_goals")
      .select("user_id, actual_revenue, actual_profit, actual_margin_pct, actual_fb_spend, target_revenue, target_profit")
      .eq("month", monthStart),

    // Fallback: per-site revenue rows for users without a formal goal
    supabase
      .from("site_monthly_revenue")
      .select("user_id, revenue, fb_spend, profit, margin_pct")
      .eq("month", monthStart),

    supabase
      .from("changes")
      .select("user_id")
      .gte("change_date", monthStart)
      .lt("change_date", nextMonth),

    supabase
      .from("tasks")
      .select("user_id, status")
      .in("status", ["todo", "in_progress"]),
  ]);

  // ── Build per-user index maps ─────────────────────────────────────────────

  const sitesByUser = new Map<string, string[]>();
  for (const s of userSites ?? []) {
    const arr = sitesByUser.get(s.user_id) ?? [];
    arr.push(s.site_abbreviation);
    sitesByUser.set(s.user_id, arr);
  }

  const goalByUser = new Map<string, {
    actual_revenue: number; actual_profit: number;
    actual_margin_pct: number; actual_fb_spend: number;
    target_revenue: number | null; target_profit: number | null;
  }>();
  for (const g of goals ?? []) {
    goalByUser.set(g.user_id, g);
  }

  // Aggregate site_monthly_revenue by user (fallback when no goal record)
  const siteRevByUser = new Map<string, {
    revenue: number; fb_spend: number; profit: number; totalRevForMargin: number;
  }>();
  for (const r of siteRevenues ?? []) {
    const acc = siteRevByUser.get(r.user_id) ?? { revenue: 0, fb_spend: 0, profit: 0, totalRevForMargin: 0 };
    acc.revenue       += r.revenue   ?? 0;
    acc.fb_spend      += r.fb_spend  ?? 0;
    acc.profit        += r.profit    ?? 0;
    acc.totalRevForMargin += r.revenue ?? 0;
    siteRevByUser.set(r.user_id, acc);
  }

  const changesByUser = new Map<string, number>();
  for (const c of changes ?? []) {
    changesByUser.set(c.user_id, (changesByUser.get(c.user_id) ?? 0) + 1);
  }

  const tasksByUser = new Map<string, number>();
  for (const t of tasks ?? []) {
    tasksByUser.set(t.user_id, (tasksByUser.get(t.user_id) ?? 0) + 1);
  }

  // ── Assemble member stats ─────────────────────────────────────────────────
  const members: TeamMemberStats[] = (profiles ?? []).map((p) => {
    const goal        = goalByUser.get(p.id) ?? null;
    const siteRev     = siteRevByUser.get(p.id) ?? null;
    const sites       = sitesByUser.get(p.id) ?? [];
    const changesCount = changesByUser.get(p.id) ?? 0;
    const openTasks   = tasksByUser.get(p.id) ?? 0;

    // Prefer goal actuals; fall back to aggregated site_monthly_revenue
    let actual_revenue:    number | null = null;
    let actual_profit:     number | null = null;
    let actual_margin_pct: number | null = null;
    let actual_fb_spend:   number | null = null;
    let target_revenue:    number | null = null;
    let target_profit:     number | null = null;

    if (goal) {
      actual_revenue    = goal.actual_revenue;
      actual_profit     = goal.actual_profit;
      actual_margin_pct = goal.actual_margin_pct;
      actual_fb_spend   = goal.actual_fb_spend;
      target_revenue    = goal.target_revenue;
      target_profit     = goal.target_profit;
    } else if (siteRev) {
      actual_revenue  = siteRev.revenue;
      actual_profit   = siteRev.profit;
      actual_fb_spend = siteRev.fb_spend;
      actual_margin_pct = siteRev.totalRevForMargin > 0
        ? (siteRev.profit / siteRev.totalRevForMargin) * 100
        : 0;
    }

    // Determine goal pace status
    let goal_status: GoalStatus = "no_goal";
    if (target_revenue && target_revenue > 0 && actual_revenue !== null) {
      const today       = new Date();
      const mStart      = startOfMonth(today);
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysElapsed = Math.max(1, today.getDate());
      const paceTarget  = (daysElapsed / daysInMonth) * target_revenue;
      const ratio       = paceTarget > 0 ? actual_revenue / paceTarget : 1;

      if (ratio >= 1.1)      goal_status = "ahead";
      else if (ratio >= 0.8) goal_status = "on_track";
      else                   goal_status = "behind";

      // Historical month: compare actual vs full target
      if (month !== format(mStart, "yyyy-MM")) {
        const hitRatio = actual_revenue / target_revenue;
        if (hitRatio >= 1)         goal_status = "ahead";
        else if (hitRatio >= 0.8)  goal_status = "on_track";
        else                       goal_status = "behind";
      }
    } else if (actual_revenue !== null) {
      // Has revenue data but no formal target — show neutral "no_goal"
      goal_status = "no_goal";
    }

    return {
      id:                 p.id,
      email:              p.email,
      full_name:          p.full_name,
      nickname:           p.nickname,
      avatar_url:         p.avatar_url,
      site_count:         sites.length,
      sites,
      actual_revenue,
      actual_profit,
      actual_margin_pct,
      actual_fb_spend,
      target_revenue,
      target_profit,
      goal_status,
      changes_this_month: changesCount,
      open_tasks:         openTasks,
    };
  });

  const total_revenue  = members.reduce((s, m) => s + (m.actual_revenue  ?? 0), 0);
  const total_profit   = members.reduce((s, m) => s + (m.actual_profit   ?? 0), 0);
  const total_fb_spend = members.reduce((s, m) => s + (m.actual_fb_spend ?? 0), 0);
  const total_sites    = members.reduce((s, m) => s + m.site_count, 0);

  const overview: TeamOverview = {
    month,
    members,
    total_revenue,
    total_profit,
    total_fb_spend,
    total_sites,
  };

  return NextResponse.json(overview);
}
