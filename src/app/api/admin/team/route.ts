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
  const monthStart = `${month}-01`;

  // Compute next month start for open-ended range
  const [year, mon] = month.split("-").map(Number);
  const nextMonth = mon === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(mon + 1).padStart(2, "0")}-01`;

  // ── 5 parallel data fetches ───────────────────────────────────────────────
  const [
    { data: profiles },
    { data: userSites },
    { data: goals },
    { data: changes },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, nickname, avatar_url")
      .order("created_at", { ascending: true }),

    supabase
      .from("user_sites")
      .select("user_id, site_abbreviation"),

    supabase
      .from("revenue_goals")
      .select("user_id, actual_revenue, actual_profit, actual_margin_pct, actual_fb_spend, target_revenue, target_profit")
      .eq("month", month),

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

  const goalByUser = new Map<string, typeof goals extends (infer T)[] | null ? T : never>();
  for (const g of goals ?? []) {
    goalByUser.set(g.user_id, g);
  }

  // Count changes per user
  const changesByUser = new Map<string, number>();
  for (const c of changes ?? []) {
    changesByUser.set(c.user_id, (changesByUser.get(c.user_id) ?? 0) + 1);
  }

  // Count open tasks per user
  const tasksByUser = new Map<string, number>();
  for (const t of tasks ?? []) {
    tasksByUser.set(t.user_id, (tasksByUser.get(t.user_id) ?? 0) + 1);
  }

  // ── Assemble member stats ─────────────────────────────────────────────────
  const members: TeamMemberStats[] = (profiles ?? []).map((p) => {
    const goal        = goalByUser.get(p.id) ?? null;
    const sites       = sitesByUser.get(p.id) ?? [];
    const changesCount = changesByUser.get(p.id) ?? 0;
    const openTasks   = tasksByUser.get(p.id) ?? 0;

    let goal_status: GoalStatus = "no_goal";
    if (goal && goal.target_revenue && goal.target_revenue > 0) {
      // Calculate expected pace: what % of month has elapsed?
      const today      = new Date();
      const mStart     = startOfMonth(today);
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysElapsed = Math.max(1, today.getDate());
      const paceTarget  = (daysElapsed / daysInMonth) * goal.target_revenue;
      const actual      = goal.actual_revenue ?? 0;
      const ratio       = paceTarget > 0 ? actual / paceTarget : 1;

      if (ratio >= 1.1)      goal_status = "ahead";
      else if (ratio >= 0.8) goal_status = "on_track";
      else                   goal_status = "behind";

      // If viewing a historical month, just compare actual vs target
      if (month !== format(mStart, "yyyy-MM")) {
        const hitRatio = actual / goal.target_revenue;
        if (hitRatio >= 1)    goal_status = "ahead";
        else if (hitRatio >= 0.8) goal_status = "on_track";
        else                  goal_status = "behind";
      }
    }

    return {
      id:                 p.id,
      email:              p.email,
      full_name:          p.full_name,
      nickname:           p.nickname,
      avatar_url:         p.avatar_url,
      site_count:         sites.length,
      sites,
      actual_revenue:     goal?.actual_revenue    ?? null,
      actual_profit:      goal?.actual_profit     ?? null,
      actual_margin_pct:  goal?.actual_margin_pct ?? null,
      actual_fb_spend:    goal?.actual_fb_spend   ?? null,
      target_revenue:     goal?.target_revenue    ?? null,
      target_profit:      goal?.target_profit     ?? null,
      goal_status,
      changes_this_month: changesCount,
      open_tasks:         openTasks,
    };
  });

  const total_revenue  = members.reduce((s, m) => s + (m.actual_revenue  ?? 0), 0);
  const total_profit   = members.reduce((s, m) => s + (m.actual_profit   ?? 0), 0);
  const total_fb_spend = members.reduce((s, m) => s + (m.actual_fb_spend ?? 0), 0);

  const overview: TeamOverview = {
    month,
    members,
    total_revenue,
    total_profit,
    total_fb_spend,
  };

  return NextResponse.json(overview);
}
