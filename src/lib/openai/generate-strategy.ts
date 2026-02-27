import { getOpenAIClient } from "./client";
import { GOAL_STRATEGY_PROMPT } from "./prompts";
import { GoalStrategy } from "../types/goals";

export async function generateGoalStrategy(
  goal: Record<string, unknown>,
  progress: Record<string, unknown>,
  siteData: Array<Record<string, unknown>>,
  recentChanges: Array<Record<string, unknown>>
): Promise<GoalStrategy> {
  const openai = getOpenAIClient();

  const siteLines =
    siteData.length > 0
      ? siteData
          .map(
            (s) =>
              `${s.site}: Rev $${s.revenue}, Spend $${s.fb_spend}, Profit $${s.profit}, Margin ${s.margin_pct}%`
          )
          .join("\n")
      : "No site data available yet.";

  const changeLines =
    recentChanges.length > 0
      ? recentChanges
          .slice(0, 10)
          .map(
            (c) =>
              `${c.change_date}: ${c.action_type} ${c.campaign_name} (${c.site || "?"}) ${c.change_value || ""} - ${c.impact_verdict || "pending"}`
          )
          .join("\n")
      : "No recent changes.";

  const context = `
Month: ${goal.month}
Target Revenue: $${goal.target_revenue || "not set"}
Target Profit: $${goal.target_profit || "not set"}
Target Margin: ${goal.target_margin_pct || "not set"}%

Current Progress (Day ${progress.daysElapsed} of ${progress.daysInMonth}):
- Revenue: $${goal.actual_revenue} (${typeof progress.revenueProgress === "number" ? (progress.revenueProgress as number).toFixed(1) : 0}% of target)
- FB Spend: $${goal.actual_fb_spend}
- Profit: $${goal.actual_profit} (${typeof progress.profitProgress === "number" ? (progress.profitProgress as number).toFixed(1) : 0}% of target)
- Margin: ${goal.actual_margin_pct}%
- Days Remaining: ${progress.daysRemaining}
- Daily Revenue Needed: $${typeof progress.dailyRevenueNeeded === "number" ? (progress.dailyRevenueNeeded as number).toFixed(2) : "N/A"}

Site Performance (this month):
${siteLines}

Recent Changes:
${changeLines}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: GOAL_STRATEGY_PROMPT },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content) as GoalStrategy;
}
