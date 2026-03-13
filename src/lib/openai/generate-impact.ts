import { getOpenAIClient } from "./client";
import { IMPACT_ASSESSMENT_PROMPT } from "./prompts";
import { CampaignMetrics, Change, ImpactVerdict } from "../types/changes";
import { computeMetricDeltas, formatMetricValue, formatDelta } from "../utils/metrics";

interface KpiTrend {
  trend: string;
  detail: string;
}

interface ImpactResult {
  impact_summary: string;
  impact_verdict: ImpactVerdict;
  kpi_trends?: {
    fb_cpc?: KpiTrend;
    ad_rpm?: KpiTrend;
    ad_cpc?: KpiTrend;
    fb_margin?: KpiTrend;
  } | null;
}

export async function generateImpactAssessment(
  change: Change,
  postMetrics: CampaignMetrics,
  screenshotBase64?: string | null
): Promise<ImpactResult> {
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
Change date: ${change.change_date}
Description: ${change.description || "N/A"}${testLine}${hypothesisLine}

Before → After metrics (summary row):
${deltasTable || "No comparable metrics available."}

${screenshotBase64 ? "A screenshot of the dash.ltv.so dashboard is attached. Use it to analyze day-by-day trends for the 4 focus KPIs starting from the change date (" + change.change_date + ")." : "No screenshot provided. Analyze based on the summary metrics above only."}
`;

  // Build message content — vision if screenshot provided, text-only otherwise
  type ChatContent = string | Array<{ type: "image_url"; image_url: { url: string; detail: "high" } } | { type: "text"; text: string }>;

  const userContent: ChatContent = screenshotBase64
    ? [
        { type: "image_url", image_url: { url: screenshotBase64, detail: "high" } },
        { type: "text", text: context },
      ]
    : context;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: IMPACT_ASSESSMENT_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return {
      impact_summary: "Unable to generate impact assessment.",
      impact_verdict: "inconclusive",
      kpi_trends: null,
    };
  }

  try {
    const parsed = JSON.parse(content);
    return {
      impact_summary: parsed.impact_summary || "Unable to generate assessment.",
      impact_verdict: parsed.impact_verdict || "inconclusive",
      kpi_trends: parsed.kpi_trends || null,
    };
  } catch {
    return {
      impact_summary: "Unable to parse impact assessment.",
      impact_verdict: "inconclusive",
      kpi_trends: null,
    };
  }
}
