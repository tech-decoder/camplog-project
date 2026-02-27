"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  ImageIcon,
  X,
  Calendar,
  Clock,
  MapPin,
  Target,
  Loader2,
  Ban,
  Pencil,
  Globe,
  Check,
  FlaskConical,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { Change, CampaignMetrics } from "@/lib/types/changes";
import {
  ACTION_TYPE_CONFIG,
  VERDICT_CONFIG,
  METRIC_LABELS,
  TEST_CATEGORIES,
} from "@/lib/constants";
import { KNOWN_SITES, SITE_ABBREVIATION_MAP } from "@/lib/constants/sites";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionIcon } from "@/components/ui/action-icon";
import { formatDate } from "@/lib/utils/dates";
import {
  computeMetricDeltas,
  formatMetricValue,
  formatDelta,
  getMetricColorClass,
  getMetricBgClass,
  toNumericValue,
} from "@/lib/utils/metrics";
import { toast } from "sonner";

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ChangeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [change, setChange] = useState<Change | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [postMetrics, setPostMetrics] = useState<Record<string, string>>({});
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Void modal
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editSite, setEditSite] = useState("");
  const [editCampaignName, setEditCampaignName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchChange();
  }, [params.id]);

  async function fetchChange() {
    try {
      const res = await fetch(`/api/changes/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setChange(data);
        setEditSite(data.site || "");
        setEditCampaignName(data.campaign_name || "");
      }
    } catch (err) {
      console.error("Failed to fetch change:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScreenshotUpload(file: File) {
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/extract-metrics", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          const extracted: Record<string, string> = {};
          for (const [key, val] of Object.entries(data.metrics)) {
            if (typeof val === "number") {
              extracted[key] = val.toString();
            }
          }
          setPostMetrics((prev) => ({ ...prev, ...extracted }));
          toast.success(
            `Extracted ${Object.keys(extracted).length} metrics from screenshot`
          );
        }
      } else {
        toast.error("Failed to extract metrics from screenshot");
      }
    } catch {
      toast.error("Failed to process screenshot");
    } finally {
      setExtracting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleScreenshotUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleScreenshotUpload(file);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) handleScreenshotUpload(file);
        break;
      }
    }
  }

  function removeScreenshot() {
    setScreenshotPreview(null);
    setScreenshotFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmitReview() {
    if (!change) return;
    setSubmitting(true);

    const metrics: CampaignMetrics = {};
    for (const [key, val] of Object.entries(postMetrics)) {
      if (val.trim()) {
        (metrics as Record<string, number>)[key] = parseFloat(val);
      }
    }

    try {
      const res = await fetch(`/api/changes/${change.id}/impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_metrics: metrics }),
      });

      if (res.ok) {
        const updated = await res.json();
        setChange(updated);
        toast.success("Impact review submitted");
      } else {
        toast.error("Failed to submit review");
      }
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVoid() {
    if (!change) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/changes/${change.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "voided",
          void_reason: voidReason || "Change did not happen",
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setChange(updated);
        setShowVoidDialog(false);
        toast.success("Change marked as voided");
      } else {
        toast.error("Failed to void change");
      }
    } catch {
      toast.error("Failed to void change");
    } finally {
      setVoiding(false);
    }
  }

  async function handleSaveEdit() {
    if (!change) return;
    setSavingEdit(true);
    try {
      const siteValue = editSite && editSite !== "none" ? editSite : null;

      // Update the change itself
      const res = await fetch(`/api/changes/${change.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: editCampaignName,
          site: siteValue,
        }),
      });

      // Also update the parent campaign's site if campaign_id exists
      if (change.campaign_id && siteValue !== (change.site || null)) {
        await fetch(`/api/campaigns/${change.campaign_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site: siteValue }),
        });
      }

      if (res.ok) {
        const updated = await res.json();
        setChange(updated);
        setEditing(false);
        toast.success("Change updated");
      } else {
        toast.error("Failed to update change");
      }
    } catch {
      toast.error("Failed to update change");
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!change) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Change not found</p>
        <Link href="/changes">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to changes
          </Button>
        </Link>
      </div>
    );
  }

  const config = ACTION_TYPE_CONFIG[change.action_type];
  const hasPreMetrics = Object.keys(change.pre_metrics || {}).length > 0;
  const hasPostMetrics = Object.keys(change.post_metrics || {}).length > 0;
  const deltas =
    hasPreMetrics && hasPostMetrics
      ? computeMetricDeltas(change.pre_metrics, change.post_metrics)
      : [];
  const isPause =
    change.action_type === "pause_campaign" ||
    change.action_type === "pause_geo";
  const needsReview =
    !isPause && !change.impact_reviewed_at && change.impact_review_due;
  const reviewDaysAfter = change.impact_reviewed_at
    ? daysBetween(change.change_date, change.impact_reviewed_at)
    : null;
  const isVoided = change.status === "voided";

  const preMetricKeys = Object.keys(change.pre_metrics || {}).filter(
    (k) => k !== "time_range" && k !== "source_date" && k in METRIC_LABELS
  );

  const fbCostKeys = ["fb_spend", "fb_cpc", "fb_ctr", "fb_clicks", "fb_leads", "fb_margin_pct", "fb_daily_budget"];
  const adRevenueKeys = ["ad_revenue", "ad_clicks", "ad_ctr", "ad_cpc", "ad_rpm"];
  const profitKeys = ["gross_profit", "margin_pct", "roi", "roas"];

  const preMetricEntries = Object.entries(change.pre_metrics || {}).filter(
    ([k, v]) => k !== "time_range" && k !== "source_date" && v != null && k in METRIC_LABELS
  );

  function groupMetrics(entries: [string, unknown][]) {
    const fb = entries.filter(([k]) => fbCostKeys.includes(k));
    const ad = entries.filter(([k]) => adRevenueKeys.includes(k));
    const profit = entries.filter(([k]) => profitKeys.includes(k));
    return { fb, ad, profit };
  }

  const grouped = groupMetrics(preMetricEntries);
  const siteInfo = change.site ? SITE_ABBREVIATION_MAP[change.site] : null;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" onPaste={handlePaste}>
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {!isVoided && !editing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-rose-600"
                onClick={() => setShowVoidDialog(true)}
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                Void
              </Button>
            </>
          )}
          {change.impact_reviewed_at && reviewDaysAfter !== null && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              Reviewed {reviewDaysAfter}d after
            </Badge>
          )}
        </div>
      </div>

      {/* Voided Banner */}
      {isVoided && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-start gap-3">
          <Ban className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-700">
              This change has been voided
            </p>
            {change.void_reason && (
              <p className="text-sm text-slate-500 mt-0.5">
                {change.void_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Void Dialog */}
      {showVoidDialog && (
        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-rose-600" />
              <p className="text-sm font-medium">Mark as Voided</p>
            </div>
            <p className="text-xs text-muted-foreground">
              This change will be crossed out and marked as not happened. You can still see it in your history.
            </p>
            <Input
              placeholder="Reason (e.g. ad account restricted, didn't publish)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleVoid}
                disabled={voiding}
              >
                {voiding && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Void Change
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowVoidDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Summary Card */}
      <Card className={isVoided ? "opacity-70" : ""}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Top row: badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={`${config?.bgColor} ${config?.color} text-sm px-3 py-1 gap-1.5`}
              >
                {config && <ActionIcon iconName={config.icon} className="h-3.5 w-3.5" />}
                {config?.label}
              </Badge>
              {isVoided && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-sm px-3 py-1">
                  Voided
                </Badge>
              )}
              {change.impact_verdict && !isVoided && (
                <Badge
                  variant="secondary"
                  className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color} text-sm px-3 py-1`}
                >
                  {VERDICT_CONFIG[change.impact_verdict]?.label} Impact
                </Badge>
              )}
              {isPause && !isVoided && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-sm px-3 py-1">
                  No Review Needed
                </Badge>
              )}
              {needsReview && !isVoided && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 text-sm px-3 py-1"
                >
                  Review Due
                </Badge>
              )}
              {change.test_category && (
                <Badge
                  variant="secondary"
                  className="bg-purple-50 text-purple-700 text-sm px-3 py-1 gap-1.5"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  {TEST_CATEGORIES[change.test_category]?.label || change.test_category}
                </Badge>
              )}
            </div>

            {/* Campaign name + value */}
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Campaign Name</Label>
                    <Input
                      value={editCampaignName}
                      onChange={(e) => setEditCampaignName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Site</Label>
                    <Select value={editSite} onValueChange={setEditSite}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No site</SelectItem>
                        {KNOWN_SITES.map((s) => (
                          <SelectItem key={s.abbreviation} value={s.abbreviation}>
                            {s.abbreviation} — {s.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="bg-[#366ae8] hover:bg-[#2d5bcf] text-white"
                  >
                    {savingEdit && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <h1 className={`text-2xl font-bold tracking-tight ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                {change.campaign_name}
                {change.change_value ? (
                  <span className={isVoided ? "text-muted-foreground" : "text-primary"}>
                    {" "}{change.change_value}
                  </span>
                ) : null}
              </h1>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {change.site && (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  <Badge variant="secondary" className="bg-[#366ae8]/10 text-[#366ae8] text-xs font-semibold">
                    {change.site}
                  </Badge>
                  {siteInfo && (
                    <span className="text-xs">{siteInfo.domain}</span>
                  )}
                </div>
              )}
              {change.geo && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{change.geo}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(change.change_date)}</span>
              </div>
              {change.metrics_time_range && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{change.metrics_time_range}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {change.description && (
              <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                {change.description}
              </p>
            )}

            {/* Hypothesis */}
            {change.hypothesis && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wider">Hypothesis</p>
                  <p className="text-sm text-foreground mt-0.5">{change.hypothesis}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Before vs After — most important section */}
      {!isVoided && deltas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Before vs After</CardTitle>
              {reviewDaysAfter !== null && (
                <Badge variant="secondary" className="bg-[#366ae8]/10 text-[#366ae8] text-xs">
                  {reviewDaysAfter}d after change
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {deltas.map((d) => (
                <div
                  key={d.key}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 border-b border-border/30 last:border-0"
                >
                  <span className="text-sm font-medium w-24">{d.label}</span>
                  <div className="flex items-center gap-4 flex-1 justify-end">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatMetricValue(d.before, d.unit)}
                    </span>
                    <span className="text-muted-foreground/50">&rarr;</span>
                    <span className="text-base font-semibold tabular-nums">
                      {formatMetricValue(d.after, d.unit)}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs font-medium px-2 py-0.5 min-w-[70px] justify-center gap-1 ${
                        d.isImprovement
                          ? "bg-emerald-100 text-emerald-700"
                          : d.direction === "flat"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {d.direction === "up" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : d.direction === "down" ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {d.percentChange >= 0 ? "+" : ""}
                      {d.percentChange.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics at Time of Change — compact grid with conditional formatting */}
      {!isVoided && hasPreMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Metrics at Time of Change</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grouped.fb.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Facebook / Cost
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                    {grouped.fb.map(([key, value]) => {
                      const meta = METRIC_LABELS[key];
                      const numVal = toNumericValue(value) ?? 0;
                      return (
                        <div key={key} className={`text-center p-2.5 rounded-lg ${getMetricBgClass(key, numVal)}`}>
                          <p className="text-[10px] text-muted-foreground">{meta?.label || key}</p>
                          <p className={`text-base font-semibold mt-0.5 tabular-nums ${getMetricColorClass(key, numVal)}`}>
                            {formatMetricValue(value, meta?.unit || "")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {grouped.ad.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    AdSense / Revenue
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                    {grouped.ad.map(([key, value]) => {
                      const meta = METRIC_LABELS[key];
                      const numVal = toNumericValue(value) ?? 0;
                      return (
                        <div key={key} className={`text-center p-2.5 rounded-lg ${getMetricBgClass(key, numVal)}`}>
                          <p className="text-[10px] text-muted-foreground">{meta?.label || key}</p>
                          <p className={`text-base font-semibold mt-0.5 tabular-nums ${getMetricColorClass(key, numVal)}`}>
                            {formatMetricValue(value, meta?.unit || "")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {grouped.profit.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Profitability
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                    {grouped.profit.map(([key, value]) => {
                      const meta = METRIC_LABELS[key];
                      const numVal = toNumericValue(value) ?? 0;
                      return (
                        <div key={key} className={`text-center p-2.5 rounded-lg ${getMetricBgClass(key, numVal)}`}>
                          <p className="text-[10px] text-muted-foreground">{meta?.label || key}</p>
                          <p className={`text-base font-semibold mt-0.5 tabular-nums ${getMetricColorClass(key, numVal)}`}>
                            {formatMetricValue(value, meta?.unit || "")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Impact Assessment — full width */}
      {!isVoided && change.impact_summary && (
        <Card className={
          change.impact_verdict === "positive"
            ? "border-emerald-200 bg-emerald-50/30"
            : change.impact_verdict === "negative"
              ? "border-rose-200 bg-rose-50/30"
              : ""
        }>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">AI Impact Assessment</CardTitle>
              {change.impact_verdict && (
                <Badge
                  variant="secondary"
                  className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color}`}
                >
                  {VERDICT_CONFIG[change.impact_verdict]?.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{change.impact_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Impact Review Form — only for non-pause, non-reviewed, non-voided changes */}
      {needsReview && !isVoided && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submit Impact Review</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload a screenshot from dash.ltv.so or manually enter post-change metrics.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Screenshot Upload Zone */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Screenshot (auto-extracts metrics)
              </Label>
              {screenshotPreview ? (
                <div className="relative inline-block">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="max-h-48 rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {extracting && (
                    <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting metrics...
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-[#366ae8]/50 hover:bg-[#366ae8]/5 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-[#366ae8]/10 rounded-full p-3">
                      <ImageIcon className="h-5 w-5 text-[#366ae8]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Drop screenshot here or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You can also paste (Ctrl+V) from clipboard
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or enter manually
              </span>
            </div>

            {/* Metric Inputs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(preMetricKeys.length > 0
                ? preMetricKeys
                : [
                    "fb_spend",
                    "fb_cpc",
                    "ad_revenue",
                    "ad_ctr",
                    "ad_rpm",
                    "margin_pct",
                    "gross_profit",
                  ]
              ).map((key) => {
                const meta = METRIC_LABELS[key];
                const hasValue = postMetrics[key] && postMetrics[key].trim();
                return (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">
                      {meta?.label || key}
                      {meta?.unit ? ` (${meta.unit})` : ""}
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder={
                        change.pre_metrics?.[
                          key as keyof CampaignMetrics
                        ]?.toString() || "0"
                      }
                      value={postMetrics[key] || ""}
                      onChange={(e) =>
                        setPostMetrics((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className={hasValue ? "border-emerald-300 bg-emerald-50/50" : ""}
                    />
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleSubmitReview}
              disabled={
                submitting ||
                extracting ||
                Object.values(postMetrics).every((v) => !v.trim())
              }
              className="w-full bg-[#366ae8] hover:bg-[#2d5bcf] text-white"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing impact...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Impact Review
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
