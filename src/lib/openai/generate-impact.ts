import { getOpenAIClient } from "./client";
import { IMPACT_ASSESSMENT_PROMPT } from "./prompts";
import { CampaignMetrics, Change, ImpactVerdict } from "../types/changes";
import { computeMetricDeltas, formatMetricValue, formatDelta } from "../utils/metrics";

export async function generateImpactAssessment(
  change: Change,
  postMetrics: CampaignMetrics
): Promise<{ impact_summary: string; impact_verdict: ImpactVerdict }> {
  const openai = getOpenAIClient();

  const deltas = computeMetricDeltas(change.pre_metrics, postMetrics);

  const deltasTable = deltas
    .map(
      (d) =>
        `${d.label}: ${formatMetricValue(d.before, d.unit)} → ${formatMetricValue(d.after, d.unit)} (${formatDelta(d.absoluteChange, d.unit)}, ${d.percentChange >= 0 ? "+" : ""}${d.percentChange.toFixed(1)}%)`
    )
    .join("\n");

  const hypothesisLine = change.hypothesis
    ? `\nHypothesis being tested: ${change.hypothesis}`
    : "";
  const testLine = change.test_category
    ? `\nTest category: ${change.test_category}`
    : "";

  const context = `
Change: ${change.action_type} on ${change.campaign_name}${change.geo ? ` (${change.geo})` : ""}
Value: ${change.change_value || "N/A"}
Date: ${change.change_date}
Description: ${change.description || "N/A"}${testLine}${hypothesisLine}

Before → After metrics:
${deltasTable || "No comparable metrics available."}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: IMPACT_ASSESSMENT_PROMPT },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1024,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return {
      impact_summary: "Unable to generate impact assessment.",
      impact_verdict: "inconclusive",
    };
  }

  try {
    const parsed = JSON.parse(content);
    return {
      impact_summary: parsed.impact_summary || "Unable to generate assessment.",
      impact_verdict: parsed.impact_verdict || "inconclusive",
    };
  } catch {
    return {
      impact_summary: "Unable to parse impact assessment.",
      impact_verdict: "inconclusive",
    };
  }
}
