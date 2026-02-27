import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { getOpenAIClient } from "@/lib/openai/client";
import { REPORT_GENERATION_PROMPT } from "@/lib/openai/prompts";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data || [] });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();

  const { report_type, period_start, period_end } = body as {
    report_type: string;
    period_start: string;
    period_end: string;
  };

  if (!report_type || !period_start || !period_end) {
    return NextResponse.json(
      { error: "report_type, period_start, and period_end are required" },
      { status: 400 }
    );
  }

  // Fetch changes for the period
  const { data: changes } = await supabase
    .from("changes")
    .select("*")
    .eq("user_id", userId)
    .gte("change_date", period_start)
    .lte("change_date", period_end)
    .order("change_date", { ascending: false });

  // Fetch goal for the period's month
  const monthStr = period_start.substring(0, 7) + "-01";
  const { data: goals } = await supabase
    .from("revenue_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("month", monthStr)
    .limit(1);

  const goal = goals?.[0] || null;

  // Build context for AI
  const changesSummary =
    changes && changes.length > 0
      ? changes
          .map(
            (c) =>
              `${c.change_date}: ${c.action_type} on ${c.campaign_name} (${c.site || "?"}) ${c.geo || ""} ${c.change_value || ""} - verdict: ${c.impact_verdict || "pending"}${c.pre_metrics?.margin_pct != null ? ` margin: ${c.pre_metrics.margin_pct}%` : ""}`
          )
          .join("\n")
      : "No changes in this period.";

  const goalContext = goal
    ? `\n\nGoal Progress:\n- Target Revenue: $${goal.target_revenue}\n- Actual Revenue: $${goal.actual_revenue}\n- Target Profit: $${goal.target_profit}\n- Actual Profit: $${goal.actual_profit}\n- Margin: ${goal.actual_margin_pct}%`
    : "";

  const totalChanges = changes?.length || 0;
  const reviewedCount =
    changes?.filter((c) => c.impact_reviewed_at).length || 0;
  const pendingCount = totalChanges - reviewedCount;
  const positiveCount =
    changes?.filter((c) => c.impact_verdict === "positive").length || 0;
  const negativeCount =
    changes?.filter((c) => c.impact_verdict === "negative").length || 0;

  const context = `Report Period: ${period_start} to ${period_end}
Report Type: ${report_type}

Statistics:
- Total changes: ${totalChanges}
- Reviewed: ${reviewedCount}
- Pending review: ${pendingCount}
- Positive impact: ${positiveCount}
- Negative impact: ${negativeCount}

Changes:
${changesSummary}${goalContext}`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: REPORT_GENERATION_PROMPT },
        { role: "user", content: context },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    });

    const reportContent =
      response.choices[0]?.message?.content || "Unable to generate report.";
    const title = `${report_type.charAt(0).toUpperCase() + report_type.slice(1)} Report: ${period_start} to ${period_end}`;

    // Save report
    const { data: report, error: saveError } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        report_type,
        period_start,
        period_end,
        title,
        content: reportContent,
        metadata: {
          total_changes: totalChanges,
          reviewed: reviewedCount,
          positive: positiveCount,
          negative: negativeCount,
        },
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("Report generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
