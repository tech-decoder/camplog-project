"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Upload,
  Save,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ImageIcon,
  X,
  Check,
} from "lucide-react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { RevenueGoal, SiteMonthlyRevenue, GoalStrategy } from "@/lib/types/goals";
import { useProfile } from "@/components/providers/profile-provider";
import { formatDollar, formatPercent } from "@/lib/utils/metrics";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

export default function GoalsPage() {
  const { profile } = useProfile();
  const [currentMonth, setCurrentMonth] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM")
  );
  const [goal, setGoal] = useState<RevenueGoal | null>(null);
  const [sites, setSites] = useState<SiteMonthlyRevenue[]>([]);
  const [strategy, setStrategy] = useState<GoalStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Goal form
  const [targetRevenue, setTargetRevenue] = useState("");
  const [targetProfit, setTargetProfit] = useState("");
  const [targetMargin, setTargetMargin] = useState("");

  // Site editing
  const [siteEdits, setSiteEdits] = useState<
    Record<
      string,
      {
        revenue: string;
        fb_spend: string;
        fb_revenue: string;
        fb_profit: string;
        fbm_pct: string;
      }
    >
  >({});
  const [savingSites, setSavingSites] = useState(false);
  const [extractedTotal, setExtractedTotal] = useState<{
    revenue: number;
    fb_spend: number;
    fb_revenue: number;
    fb_profit: number;
    fbm_pct: number;
  } | null>(null);

  // Screenshot upload
  const [extracting, setExtracting] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [extractedCount, setExtractedCount] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build site list from user's own sites instead of hardcoded mySites
  const mySites = (profile?.sites || []).map((s) => ({
    abbreviation: s.abbreviation,
    shortName: s.name,
    domain: s.url || "",
  }));

  const fetchGoal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/goals?month=${currentMonth}`);
      if (res.ok) {
        const data = await res.json();
        const found = data.goals?.[0] || null;
        setGoal(found);
        if (found) {
          setTargetRevenue(found.target_revenue?.toString() || "");
          setTargetProfit(found.target_profit?.toString() || "");
          setTargetMargin(found.target_margin_pct?.toString() || "");
          setShowSetup(false);

          // Fetch site data
          const siteRes = await fetch(`/api/goals/${found.id}/sites`);
          if (siteRes.ok) {
            const siteData = await siteRes.json();
            setSites(siteData.sites || []);
          }

          // Load saved strategy
          if (found.ai_strategy) {
            try {
              setStrategy(JSON.parse(found.ai_strategy));
            } catch {
              setStrategy(null);
            }
          } else {
            setStrategy(null);
          }
        } else {
          setShowSetup(true);
          setSites([]);
          setStrategy(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch goal:", err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  async function handleScreenshotUpload(file: File) {
    setExtracting(true);
    setExtractError(null);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/extract-sites", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sites && Array.isArray(data.sites)) {
          const newEdits: typeof siteEdits = {};
          let matched = 0;

          for (const extracted of data.sites) {
            // Match by abbreviation directly — the API returns our exact abbreviations
            const abbr = extracted.abbreviation?.toUpperCase();
            const knownSite = mySites.find(
              (s) => s.abbreviation === abbr
            );

            if (knownSite) {
              newEdits[knownSite.abbreviation] = {
                revenue: extracted.revenue?.toString() || "0",
                fb_spend: extracted.fb_spend?.toString() || "0",
                fb_revenue: extracted.fb_revenue?.toString() || "0",
                fb_profit: extracted.fb_profit?.toString() || "0",
                fbm_pct: extracted.fbm_pct?.toString() || "0",
              };
              matched++;
            }
          }

          // Store extracted totals for display
          if (data.total) {
            setExtractedTotal({
              revenue: data.total.revenue || 0,
              fb_spend: data.total.fb_spend || 0,
              fb_revenue: data.total.fb_revenue || 0,
              fb_profit: data.total.fb_profit || 0,
              fbm_pct: data.total.fbm_pct || 0,
            });
          }

          setSiteEdits((prev) => ({ ...prev, ...newEdits }));
          setExtractedCount(matched);
        }
      } else {
        const errData = await res.json().catch(() => null);
        console.error("Extract-sites failed:", res.status, errData);
        setExtractError(errData?.error || `Extraction failed (${res.status})`);
      }
    } catch (err) {
      console.error("Screenshot extraction failed:", err);
    } finally {
      setExtracting(false);
    }
  }

  function handleScreenshotDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleScreenshotUpload(file);
    }
  }

  function handleScreenshotPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) handleScreenshotUpload(file);
        break;
      }
    }
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          target_revenue: targetRevenue ? parseFloat(targetRevenue) : null,
          target_profit: targetProfit ? parseFloat(targetProfit) : null,
          target_margin_pct: targetMargin ? parseFloat(targetMargin) : null,
        }),
      });
      if (res.ok) {
        await fetchGoal();
      }
    } catch (err) {
      console.error("Failed to save goal:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSites() {
    if (!goal) return;
    setSavingSites(true);
    try {
      const sitesPayload = mySites.map((s) => {
        const edit = siteEdits[s.abbreviation];
        const existing = sites.find((sr) => sr.site === s.abbreviation);
        const rev = edit?.revenue
          ? parseFloat(edit.revenue)
          : Number(existing?.revenue || 0);
        const spend = edit?.fb_spend
          ? parseFloat(edit.fb_spend)
          : Number(existing?.fb_spend || 0);
        const fbRev = edit?.fb_revenue
          ? parseFloat(edit.fb_revenue)
          : Number(existing?.fb_revenue || 0);
        // Use extracted fb_profit/fbm_pct when available (from screenshot)
        const fbProfit = edit?.fb_profit ? parseFloat(edit.fb_profit) : undefined;
        const fbmPct = edit?.fbm_pct ? parseFloat(edit.fbm_pct) : undefined;
        return {
          site: s.abbreviation,
          revenue: rev,
          fb_spend: spend,
          fb_revenue: fbRev,
          profit: fbProfit,
          margin_pct: fbmPct,
          source: (edit ? "screenshot" : "manual") as "screenshot" | "manual",
        };
      }).filter((s) => s.revenue > 0 || s.fb_spend > 0);

      const res = await fetch(`/api/goals/${goal.id}/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: sitesPayload }),
      });

      if (res.ok) {
        setSiteEdits({});
        await fetchGoal();
      }
    } catch (err) {
      console.error("Failed to save sites:", err);
    } finally {
      setSavingSites(false);
    }
  }

  async function handleGenerateStrategy() {
    if (!goal) return;
    setGeneratingStrategy(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}/strategy`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setStrategy(data.strategy);
      }
    } catch (err) {
      console.error("Failed to generate strategy:", err);
    } finally {
      setGeneratingStrategy(false);
    }
  }

  // Progress calculations
  const monthDate = new Date(`${currentMonth}-01`);
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  ).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === monthDate.getFullYear() &&
    today.getMonth() === monthDate.getMonth();
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
  const daysRemaining = Math.max(daysInMonth - daysElapsed, 0);

  const revenueProgress =
    goal?.target_revenue && Number(goal.target_revenue) > 0
      ? (Number(goal.actual_revenue) / Number(goal.target_revenue)) * 100
      : 0;
  const profitProgress =
    goal?.target_profit && Number(goal.target_profit) > 0
      ? (Number(goal.actual_profit) / Number(goal.target_profit)) * 100
      : 0;
  const dailyRevenueNeeded =
    daysRemaining > 0 && goal?.target_revenue
      ? Math.max(
          (Number(goal.target_revenue) - Number(goal.actual_revenue)) /
            daysRemaining,
          0
        )
      : 0;

  const expectedPace = (daysElapsed / daysInMonth) * 100;
  const revenuePaceStatus =
    revenueProgress >= expectedPace
      ? "ahead"
      : revenueProgress >= expectedPace * 0.85
        ? "close"
        : "behind";

  // Site rows: use extracted fb_profit/fbm when available, else compute from FBR/FBS
  const siteRows = mySites.map((s) => {
    const siteData = sites.find((sr) => sr.site === s.abbreviation);
    const edit = siteEdits[s.abbreviation];
    const rev = edit?.revenue ? parseFloat(edit.revenue) : Number(siteData?.revenue || 0);
    const spend = edit?.fb_spend ? parseFloat(edit.fb_spend) : Number(siteData?.fb_spend || 0);
    const fbRev = edit?.fb_revenue ? parseFloat(edit.fb_revenue) : Number(siteData?.fb_revenue || 0);
    // Use extracted values (from screenshot edit) → DB values → calculated fallback
    const fbProfit = edit?.fb_profit ? parseFloat(edit.fb_profit)
      : siteData?.profit != null ? Number(siteData.profit)
      : (fbRev - spend);
    const fbm = edit?.fbm_pct ? parseFloat(edit.fbm_pct)
      : siteData?.margin_pct != null ? Number(siteData.margin_pct)
      : (fbRev > 0 ? ((fbRev - spend) / fbRev) * 100 : 0);
    return { ...s, siteData, edit, rev, spend, fbRev, fbProfit, fbm, isEdited: !!edit };
  }).sort((a, b) => b.rev - a.rev);

  const totalRev = siteRows.reduce((s, r) => s + r.rev, 0);
  const totalSpend = siteRows.reduce((s, r) => s + r.spend, 0);
  const totalFbRev = siteRows.reduce((s, r) => s + r.fbRev, 0);
  const totalFbProfit = siteRows.reduce((s, r) => s + r.fbProfit, 0);
  const totalFbm = totalFbRev > 0 ? (totalFbProfit / totalFbRev) * 100 : 0;

  function updateSiteField(abbreviation: string, field: string, value: string) {
    setSiteEdits((prev) => {
      const sData = sites.find((sr) => sr.site === abbreviation);
      const current = prev[abbreviation] || {
        revenue: sData?.revenue ? Number(sData.revenue).toString() : "",
        fb_spend: sData?.fb_spend ? Number(sData.fb_spend).toString() : "",
        fb_revenue: sData?.fb_revenue ? Number(sData.fb_revenue).toString() : "",
        fb_profit: "",
        fbm_pct: "",
      };
      // When user manually edits revenue/spend/fbrev, clear extracted fb_profit/fbm so they get recalculated
      const cleared = (field === "revenue" || field === "fb_spend" || field === "fb_revenue")
        ? { ...current, fb_profit: "", fbm_pct: "", [field]: value }
        : { ...current, [field]: value };
      return { ...prev, [abbreviation]: cleared };
    });
  }

  const marginColor = (v: number) =>
    v > 10 ? "text-emerald-700 dark:text-emerald-400" : v > 0 ? "text-amber-700 dark:text-amber-400" : v < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground/60";
  const grossColor = (v: number) =>
    v > 0 ? "text-emerald-700 dark:text-emerald-400" : v < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground/60";

  // Chart data: only sites with revenue
  const chartRows = siteRows
    .filter((r) => r.rev > 0)
    .map((r) => ({ name: r.abbreviation, revenue: r.rev, fbm: r.fbm }));
  const barColor = (fbm: number) =>
    fbm > 10 ? "#10b981" : fbm > 0 ? "#f59e0b" : "#f43f5e";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                format(subMonths(monthDate, 1), "yyyy-MM")
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(monthDate, "MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                format(addMonths(monthDate, 1), "yyyy-MM")
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {goal && !showSetup && (
          <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
            Edit Targets
          </Button>
        )}
      </div>

      {/* Goal Setup */}
      {(showSetup || !goal) && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {goal ? "Edit" : "Set"} Monthly Targets
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Target Revenue ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 20000"
                    value={targetRevenue}
                    onChange={(e) => setTargetRevenue(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Target Profit ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2000"
                    value={targetProfit}
                    onChange={(e) => setTargetProfit(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Target Margin (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 10"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {goal ? "Update Targets" : "Set Goal"}
                </Button>
                {goal && showSetup && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowSetup(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      {goal && !showSetup && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Revenue
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      ${Number(goal.actual_revenue).toLocaleString()}
                    </p>
                    {goal.target_revenue && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        of ${Number(goal.target_revenue).toLocaleString()} target
                      </p>
                    )}
                  </div>
                  <div
                    className={`p-2.5 rounded-xl ${
                      revenuePaceStatus === "ahead"
                        ? "bg-emerald-500/10"
                        : revenuePaceStatus === "close"
                          ? "bg-amber-500/10"
                          : "bg-rose-500/10"
                    }`}
                  >
                    <DollarSign
                      className={`h-5 w-5 ${
                        revenuePaceStatus === "ahead"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : revenuePaceStatus === "close"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-rose-700 dark:text-rose-400"
                      }`}
                    />
                  </div>
                </div>
                {goal.target_revenue && (
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          revenuePaceStatus === "ahead"
                            ? "bg-emerald-500"
                            : revenuePaceStatus === "close"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.min(revenueProgress, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {revenueProgress.toFixed(1)}% complete
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Profit
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      ${Number(goal.actual_profit).toLocaleString()}
                    </p>
                    {goal.target_profit && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        of ${Number(goal.target_profit).toLocaleString()} target
                      </p>
                    )}
                  </div>
                  <div
                    className={`p-2.5 rounded-xl ${
                      Number(goal.actual_profit) >= 0
                        ? "bg-emerald-500/10"
                        : "bg-rose-500/10"
                    }`}
                  >
                    <TrendingUp
                      className={`h-5 w-5 ${
                        Number(goal.actual_profit) >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400"
                      }`}
                    />
                  </div>
                </div>
                {goal.target_profit && (
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(profitProgress, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profitProgress.toFixed(1)}% complete
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Daily Needed
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      ${dailyRevenueNeeded.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      per day to hit target
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-primary/8">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Days Left
                    </p>
                    <p className="text-2xl font-bold mt-1">{daysRemaining}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      of {daysInMonth} days &middot; FBM{" "}
                      {Number(goal.actual_margin_pct).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Site Health Chart */}
          {chartRows.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Site Health</CardTitle>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-medium text-muted-foreground">FBM</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] text-muted-foreground">&gt;10%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-[11px] text-muted-foreground">0–10%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-[11px] text-muted-foreground">&lt;0%</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={chartRows.length * 32 + 8}>
                  <BarChart
                    data={chartRows}
                    layout="vertical"
                    margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fontWeight: 600 }}
                      width={40}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const num = typeof value === "number" ? value : Number(value);
                        return [formatDollar(num), "Revenue"];
                      }}
                      labelFormatter={(label) => {
                        const row = chartRows.find((r) => r.name === label);
                        return row ? `${label} · ${row.fbm.toFixed(1)}% FBM` : label;
                      }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {chartRows.map((entry, index) => (
                        <Cell key={index} fill={barColor(entry.fbm)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Site Data Table */}
          <Card onPaste={handleScreenshotPaste}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Site Performance</CardTitle>
                <div className="flex gap-2">
                  {Object.keys(siteEdits).length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleSaveSites}
                      disabled={savingSites}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {savingSites ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Screenshot Upload Zone */}
            <CardContent className="pt-0 pb-4">
              {screenshotPreview && extractedCount > 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-200 mb-4">
                  <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 flex-1">
                    Extracted data for {extractedCount} sites from screenshot. Review values below and click Save.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setScreenshotPreview(null);
                      setExtractedCount(0);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : extracting ? (
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm text-primary">
                    Extracting site data from screenshot...
                  </p>
                </div>
              ) : extractError ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-200 mb-4">
                  <AlertTriangle className="h-4 w-4 text-rose-700 dark:text-rose-400 flex-shrink-0" />
                  <p className="text-sm text-rose-700 dark:text-rose-400 flex-1">
                    {extractError}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setExtractError(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleScreenshotDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors mb-4"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ImageIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        Import from dash.ltv.so screenshot
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Drop, click, or paste (Ctrl+V) a screenshot to auto-fill all site data
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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleScreenshotUpload(file);
                }}
              />
            </CardContent>
            <CardContent>
              {mySites.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <p className="mb-2">No sites added yet.</p>
                  <p>Go to <a href="/my-sites" className="text-primary hover:underline font-medium">My Sites</a> to add the sites you manage.</p>
                </div>
              ) : (<>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-medium">Site</TableHead>
                          <TableHead className="text-xs font-medium text-right">Revenue</TableHead>
                          <TableHead className="text-xs font-medium text-right">FB Spend</TableHead>
                          <TableHead className="text-xs font-medium text-right">FB Rev</TableHead>
                          <TableHead className="text-xs font-medium text-right">FB Profit</TableHead>
                          <TableHead className="text-xs font-medium text-right">FBM</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {siteRows.map((row) => (
                          <TableRow
                            key={row.abbreviation}
                            className={`${row.rev === 0 && row.spend === 0 ? "opacity-40" : ""} ${row.isEdited ? "bg-amber-500/10" : ""}`}
                          >
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-primary/10 text-primary text-[11px] font-bold px-1.5 py-0">
                                  {row.abbreviation}
                                </Badge>
                                <span className="text-xs font-medium">{row.shortName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 pr-0">
                              <Input
                                type="number" step="0.01" placeholder="0.00"
                                value={row.edit?.revenue ?? (row.siteData?.revenue ? Number(row.siteData.revenue).toString() : "")}
                                onChange={(e) => updateSiteField(row.abbreviation, "revenue", e.target.value)}
                                className="h-7 w-full text-right text-xs font-medium tabular-nums pr-2"
                              />
                            </TableCell>
                            <TableCell className="py-2 pr-0">
                              <Input
                                type="number" step="0.01" placeholder="0.00"
                                value={row.edit?.fb_spend ?? (row.siteData?.fb_spend ? Number(row.siteData.fb_spend).toString() : "")}
                                onChange={(e) => updateSiteField(row.abbreviation, "fb_spend", e.target.value)}
                                className="h-7 w-full text-right text-xs font-medium tabular-nums pr-2"
                              />
                            </TableCell>
                            <TableCell className="py-2 pr-0">
                              <Input
                                type="number" step="0.01" placeholder="0.00"
                                value={row.edit?.fb_revenue ?? (row.siteData?.fb_revenue ? Number(row.siteData.fb_revenue).toString() : "")}
                                onChange={(e) => updateSiteField(row.abbreviation, "fb_revenue", e.target.value)}
                                className="h-7 w-full text-right text-xs font-medium tabular-nums pr-2"
                              />
                            </TableCell>
                            <TableCell className={`py-2 text-right text-xs font-semibold tabular-nums ${grossColor(row.fbProfit)}`}>
                              {formatDollar(row.fbProfit)}
                            </TableCell>
                            <TableCell className={`py-2 text-right text-xs font-semibold tabular-nums ${marginColor(row.fbm)}`}>
                              {row.fbm.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-semibold">
                          <TableCell className="text-xs">Total ({siteRows.filter(r => r.rev > 0 || r.spend > 0).length} sites)</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatDollar(totalRev)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatDollar(totalSpend)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatDollar(totalFbRev)}</TableCell>
                          <TableCell className={`text-right text-xs tabular-nums ${grossColor(totalFbProfit)}`}>{formatDollar(totalFbProfit)}</TableCell>
                          <TableCell className={`text-right text-xs tabular-nums ${marginColor(totalFbm)}`}>{totalFbm.toFixed(1)}%</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>

                    {/* Extracted dashboard totals reference */}
                    {extractedTotal && (
                      <div className="mt-3 px-2 py-2 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium">All sites (dashboard):</span>{" "}
                          Rev {formatDollar(extractedTotal.revenue)} · FB Spend {formatDollar(extractedTotal.fb_spend)} · FB Profit {formatDollar(extractedTotal.fb_profit)} · FBM {extractedTotal.fbm_pct}%
                        </p>
                      </div>
                    )}
              </>)}
            </CardContent>
          </Card>

          {/* AI Strategy */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">AI Strategy</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateStrategy}
                  disabled={generatingStrategy}
                >
                  {generatingStrategy ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  {strategy ? "Refresh Strategy" : "Get AI Strategy"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {generatingStrategy ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing your data and generating strategy...
                    </p>
                  </div>
                </div>
              ) : strategy ? (
                <div className="space-y-6">
                  {/* Summary + Pace */}
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="secondary"
                      className={`text-xs flex-shrink-0 ${
                        strategy.pace_status === "ahead"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : strategy.pace_status === "on_track"
                            ? "bg-primary/10 text-primary"
                            : strategy.pace_status === "behind"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {strategy.pace_status === "ahead"
                        ? "Ahead"
                        : strategy.pace_status === "on_track"
                          ? "On Track"
                          : strategy.pace_status === "behind"
                            ? "Behind"
                            : "Critical"}
                    </Badge>
                    <p className="text-sm leading-relaxed">
                      {strategy.strategy_summary}
                    </p>
                  </div>

                  {/* Priority Actions */}
                  {strategy.daily_actions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">
                        Recommended Actions
                      </h4>
                      <div className="space-y-2">
                        {strategy.daily_actions.map((action, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <Badge
                              variant="secondary"
                              className={`text-xs flex-shrink-0 mt-0.5 ${
                                action.priority === "high"
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                  : action.priority === "medium"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {action.priority}
                            </Badge>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="bg-primary/10 text-primary text-xs"
                                >
                                  {action.site}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {action.action}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {action.reasoning}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Flags */}
                  {strategy.risk_flags?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">
                        Risk Flags
                      </h4>
                      <div className="space-y-2">
                        {strategy.risk_flags.map((flag, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-500/10"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-sm font-medium">
                                {flag.site}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {" "}
                                &mdash; {flag.issue}
                              </span>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                flag.severity === "high"
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                  : flag.severity === "medium"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {flag.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projection */}
                  {strategy.weekly_projection && (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <h4 className="text-sm font-semibold mb-2">
                        Monthly Projection
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Projected Revenue
                          </p>
                          <p className="font-semibold">
                            $
                            {strategy.weekly_projection.projected_monthly_revenue?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Projected Profit
                          </p>
                          <p className="font-semibold">
                            $
                            {strategy.weekly_projection.projected_monthly_profit?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Projected Margin
                          </p>
                          <p className="font-semibold">
                            {strategy.weekly_projection.projected_margin_pct?.toFixed(
                              1
                            )}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Get AI Strategy&quot; to generate data-driven
                    recommendations for hitting your monthly goals.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
