import { CampaignMetrics } from "../types/changes";
import { METRIC_LABELS } from "../constants";

export interface MetricDelta {
  key: string;
  label: string;
  unit: string;
  before: number;
  after: number;
  absoluteChange: number;
  percentChange: number;
  direction: "up" | "down" | "flat";
  isImprovement: boolean;
}

export function computeMetricDeltas(
  pre: CampaignMetrics,
  post: CampaignMetrics
): MetricDelta[] {
  const deltas: MetricDelta[] = [];

  for (const [key, config] of Object.entries(METRIC_LABELS)) {
    const beforeRaw = (pre as Record<string, unknown>)[key];
    const afterRaw = (post as Record<string, unknown>)[key];
    const before = toNumericValue(beforeRaw);
    const after = toNumericValue(afterRaw);

    if (before !== null && after !== null) {
      const absoluteChange = after - before;
      const percentChange = before !== 0 ? (absoluteChange / before) * 100 : 0;
      const direction =
        absoluteChange > 0.001
          ? "up"
          : absoluteChange < -0.001
            ? "down"
            : "flat";
      const isImprovement =
        direction === "flat"
          ? true
          : config.higherIsBetter
            ? direction === "up"
            : direction === "down";

      deltas.push({
        key,
        label: config.label,
        unit: config.unit,
        before,
        after,
        absoluteChange,
        percentChange,
        direction,
        isImprovement,
      });
    }
  }

  return deltas;
}

/**
 * Coerce a metric value to a number. Handles strings like "24.53%", "$0.12", "44.04%".
 */
export function toNumericValue(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[%$,x]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

export function formatMetricValue(value: unknown, unit: string): string {
  const num = toNumericValue(value);
  if (num === null) return String(value);
  if (unit === "$") return `$${num.toFixed(2)}`;
  if (unit === "%") return `${num.toFixed(2)}%`;
  if (unit === "x") return `${num.toFixed(2)}x`;
  if (unit === "#") return num.toLocaleString();
  return num.toString();
}

export function formatDelta(delta: number, unit: string): string {
  const sign = delta >= 0 ? "+" : "";
  if (unit === "$") return `${sign}$${delta.toFixed(2)}`;
  if (unit === "%") return `${sign}${delta.toFixed(2)}pp`;
  if (unit === "x") return `${sign}${delta.toFixed(2)}x`;
  if (unit === "#") return `${sign}${delta.toLocaleString()}`;
  return `${sign}${delta}`;
}
