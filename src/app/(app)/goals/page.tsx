"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
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
  Zap,
  ShieldAlert,
  BarChart2,
  Wallet,
} from "lucide-react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
        toast.success("Site data saved");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to save site data. Please try again.");
      }
    } catch (err) {
      console.error("Failed to save sites:", err);
      toast.error("Network error — site data could not be saved.");
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
    const siteData = sites.find(
      (sr) =>
        sr.site === s.abbreviation ||
        sr.site.toLowerCase() === s.shortName.toLowerCase()
    );
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

  // Chart data: only sites with revenue — use abbreviation from user_sites
  const chartRows = siteRows
    .filter((r) => r.rev > 0)
    .map((r) => ({ name: r.abbreviation, revenue: r.rev, fbm: r.fbm }));
  const yAxisWidth = Math.max(40, ...chartRows.map((r) => r.name.length * 8));
  const barColor = (fbm: number) =>
    fbm > 10 ? "#10b981" : fbm > 0 ? "#f59e0b" : "#f43f5e";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell>
      <GradientPageHeader
        icon={Target}
        title="Revenue Goals"
        description="Set monthly revenue targets and track progress by site."
      />

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover-card-glow border-border/60">
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

            <Card className="hover-card-glow border-border/60">
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

            <Card className="hover-card-glow border-border/60">
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

            <Card className="hover-card-glow border-border/60">
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
            <Card className="hover-card-glow border-border/60">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base">Site Health</CardTitle>
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
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
                      width={yAxisWidth}
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
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Table className="min-w-[600px]">
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
                    </div>

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
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">AI Strategy</CardTitle>
                </div>
                <div className="flex items-center gap-2">
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
              </div>
            </CardHeader>
            <CardContent>
              {generatingStrategy ? (
                /* ── Loading state ───────────────────────────────────────── */
                <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl bg-primary/5 border border-primary/15 text-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-primary">Analyzing your data…</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Building a personalised strategy from your goals and site performance
                  </p>
                </div>
              ) : strategy ? (
                <div className="space-y-4">

                  {/* ── 1. Status banner — single row ─────────────────────── */}
                  {(() => {
                    const cfg = {
                      critical: { bg: "bg-rose-500/8 border-rose-200 dark:border-rose-800",   label: "Critical", labelColor: "text-rose-600 dark:text-rose-400" },
                      behind:   { bg: "bg-amber-500/8 border-amber-200 dark:border-amber-800", label: "Behind",   labelColor: "text-amber-600 dark:text-amber-400" },
                      on_track: { bg: "bg-primary/5 border-primary/20",                        label: "On Track", labelColor: "text-primary" },
                      ahead:    { bg: "bg-emerald-500/8 border-emerald-200 dark:border-emerald-800", label: "Ahead", labelColor: "text-emerald-600 dark:text-emerald-400" },
                    }[strategy.pace_status] ?? { bg: "bg-muted/40 border-border", label: strategy.pace_status, labelColor: "text-muted-foreground" };
                    return (
                      <div className={cn("rounded-xl border px-4 py-3 flex items-start gap-3", cfg.bg)}>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest flex-shrink-0 mt-0.5 min-w-[58px]", cfg.labelColor)}>
                          {cfg.label}
                        </span>
                        <p className="text-sm leading-relaxed">{strategy.strategy_summary}</p>
                      </div>
                    );
                  })()}

                  {/* ── 2. Monthly Projection — full-width strip ───────────── */}
                  {strategy.weekly_projection && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart2 className="h-3.5 w-3.5 text-primary" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Projection</h4>
                        {strategy.weekly_projection.confidence && (
                          <span className={cn(
                            "ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                            strategy.weekly_projection.confidence === "high"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : strategy.weekly_projection.confidence === "medium"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {strategy.weekly_projection.confidence} confidence
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Revenue</p>
                          <p className="text-lg font-bold text-primary tabular-nums">
                            ${Number(strategy.weekly_projection.projected_monthly_revenue ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Profit</p>
                          <p className={cn(
                            "text-lg font-bold tabular-nums",
                            Number(strategy.weekly_projection.projected_monthly_profit ?? 0) >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}>
                            ${Number(strategy.weekly_projection.projected_monthly_profit ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Margin</p>
                          <p className="text-lg font-bold tabular-nums">
                            {Number(strategy.weekly_projection.projected_margin_pct ?? 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── 3-col grid: Actions (left) | Budget (center) | Risks (right) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {/* ── Left column ──────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">

                      {/* Recommended Actions */}
                      {strategy.daily_actions?.length > 0 && (
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended Actions</h4>
                          </div>
                          <div className="space-y-1.5">
                            {strategy.daily_actions.map((action, i) => {
                              const borderColor =
                                action.priority === "high"   ? "border-l-rose-500"
                                : action.priority === "medium" ? "border-l-amber-500"
                                : "border-l-slate-300 dark:border-l-slate-600";
                              const bgColor =
                                action.priority === "high"   ? "bg-rose-500/5"
                                : action.priority === "medium" ? "bg-amber-500/5"
                                : "bg-muted/40";
                              const dotColor =
                                action.priority === "high"   ? "bg-rose-500"
                                : action.priority === "medium" ? "bg-amber-500"
                                : "bg-slate-400";
                              return (
                                <div key={i} className={cn("flex items-start gap-2 px-3 py-2 rounded-xl border-l-4", borderColor, bgColor)}>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                        {action.site}
                                      </span>
                                      <span className="text-xs font-medium leading-snug">{action.action}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{action.reasoning}</p>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                    <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dotColor)} />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{action.priority}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Budget Allocation */}
                      {strategy.budget_allocation?.length > 0 && (
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Wallet className="h-3.5 w-3.5 text-primary" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget Allocation</h4>
                          </div>
                          <div className="space-y-1.5">
                            {strategy.budget_allocation.map((alloc, i) => {
                              const isIncrease = alloc.change === "increase";
                              const isDecrease = alloc.change === "decrease";
                              const ChangeIcon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus;
                              const changeColor = isIncrease
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isDecrease ? "text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground";
                              const rowBg = isIncrease
                                ? "bg-emerald-500/5 border-emerald-200 dark:border-emerald-800"
                                : isDecrease ? "bg-rose-500/5 border-rose-200 dark:border-rose-800"
                                : "bg-muted/40 border-border";
                              return (
                                <div key={i} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", rowBg)}>
                                  <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0">
                                    {alloc.site}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <ChangeIcon className={cn("h-3 w-3 flex-shrink-0", changeColor)} />
                                      <span className={cn("text-[10px] font-semibold capitalize", changeColor)}>{alloc.change}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        ${Number(alloc.current_daily_spend ?? 0).toFixed(0)} → <span className="font-medium text-foreground">${Number(alloc.recommended_daily_spend ?? 0).toFixed(0)}/day</span>
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{alloc.reason}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Right column — Risk Flags only ───────────────────── */}
                    <div className="flex flex-col gap-3">

                      {/* Risk Flags */}
                      {strategy.risk_flags?.length > 0 && (
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Flags</h4>
                          </div>
                          <div className="space-y-1.5">
                            {strategy.risk_flags.map((flag, i) => {
                              const isHigh = flag.severity === "high";
                              const isMed  = flag.severity === "medium";
                              const rowBg  = isHigh ? "bg-rose-500/5 border-rose-200 dark:border-rose-800"
                                           : isMed  ? "bg-amber-500/5 border-amber-200 dark:border-amber-800"
                                           : "bg-muted/40 border-border";
                              const iconColor = isHigh ? "text-rose-500" : isMed ? "text-amber-500" : "text-muted-foreground";
                              const pillColor = isHigh
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                : isMed ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-muted text-muted-foreground";
                              return (
                                <div key={i} className={cn("flex items-start gap-2 px-3 py-2 rounded-xl border", rowBg)}>
                                  <AlertTriangle className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", iconColor)} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold">{flag.site}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{flag.issue}</p>
                                  </div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5", pillColor)}>
                                    {flag.severity}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                /* ── Empty state ─────────────────────────────────────────── */
                <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-primary/5 border border-primary/15 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold mb-1">No strategy generated yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Generate a data-driven strategy from your goals and site performance to get prioritised recommendations.
                  </p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={handleGenerateStrategy}
                    disabled={generatingStrategy}
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Get AI Strategy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
