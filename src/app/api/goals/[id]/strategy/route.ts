import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { generateGoalStrategy } from "@/lib/openai/generate-strategy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: goalId } = await params;
  const supabase = createAdminClient();

  // Fetch goal
  const { data: goal, error: goalError } = await supabase
    .from("revenue_goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", DEFAULT_USER_ID)
    .single();

  if (goalError || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Fetch site revenue data
  const { data: siteData } = await supabase
    .from("site_monthly_revenue")
    .select("*")
    .eq("goal_id", goalId)
    .order("revenue", { ascending: false });

  // Fetch recent changes for context
  const { data: recentChanges } = await supabase
    .from("changes")
    .select("campaign_name, site, action_type, geo, change_value, change_date, impact_verdict")
    .eq("user_id", DEFAULT_USER_ID)
    .order("created_at", { ascending: false })
    .limit(20);

  // Calculate progress
  const monthDate = new Date(goal.month);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const daysElapsed = Math.min(
    today.getDate(),
    daysInMonth
  );
  const daysRemaining = Math.max(daysInMonth - daysElapsed, 0);

  const progress = {
    goal,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    revenueProgress: goal.target_revenue
      ? (Number(goal.actual_revenue) / Number(goal.target_revenue)) * 100
      : 0,
    profitProgress: goal.target_profit
      ? (Number(goal.actual_profit) / Number(goal.target_profit)) * 100
      : 0,
    dailyRevenueNeeded:
      daysRemaining > 0 && goal.target_revenue
        ? Math.max(
            (Number(goal.target_revenue) - Number(goal.actual_revenue)) /
              daysRemaining,
            0
          )
        : 0,
    dailyProfitNeeded:
      daysRemaining > 0 && goal.target_profit
        ? Math.max(
            (Number(goal.target_profit) - Number(goal.actual_profit)) /
              daysRemaining,
            0
          )
        : 0,
  };

  try {
    const strategy = await generateGoalStrategy(
      goal,
      progress,
      siteData || [],
      recentChanges || []
    );

    // Save strategy to goal
    await supabase
      .from("revenue_goals")
      .update({
        ai_strategy: JSON.stringify(strategy),
        updated_at: new Date().toISOString(),
      })
      .eq("id", goalId);

    return NextResponse.json({ strategy });
  } catch (err) {
    console.error("Strategy generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate strategy" },
      { status: 500 }
    );
  }
}
