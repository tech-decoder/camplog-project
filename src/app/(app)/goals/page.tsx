"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { RevenueGoal, SiteMonthlyRevenue, GoalStrategy } from "@/lib/types/goals";
import { KNOWN_SITES } from "@/lib/constants/sites";

export default function GoalsPage() {
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
  const [targetSpend, setTargetSpend] = useState("");

  // Site editing
  const [siteEdits, setSiteEdits] = useState<
    Record<string, { revenue: string; fb_spend: string }>
  >({});
  const [savingSites, setSavingSites] = useState(false);

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
          setTargetSpend(found.target_fb_spend?.toString() || "");
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
          target_fb_spend: targetSpend ? parseFloat(targetSpend) : null,
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
      const sitesPayload = KNOWN_SITES.map((s) => {
        const edit = siteEdits[s.abbreviation];
        const existing = sites.find((sr) => sr.site === s.abbreviation);
        return {
          site: s.abbreviation,
          revenue: edit?.revenue
            ? parseFloat(edit.revenue)
            : Number(existing?.revenue || 0),
          fb_spend: edit?.fb_spend
            ? parseFloat(edit.fb_spend)
            : Number(existing?.fb_spend || 0),
          source: "manual" as const,
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

  // Chart data
  const chartData = KNOWN_SITES.map((s) => {
    const siteData = sites.find((sr) => sr.site === s.abbreviation);
    return {
      site: s.abbreviation,
      revenue: Number(siteData?.revenue || 0),
      spend: Number(siteData?.fb_spend || 0),
      profit: Number(siteData?.profit || 0),
    };
  })
    .filter((d) => d.revenue > 0 || d.spend > 0)
    .sort((a, b) => b.revenue - a.revenue);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[#366ae8]" />
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
        <Card className="border-[#366ae8]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#366ae8]" />
              <CardTitle className="text-base">
                {goal ? "Edit" : "Set"} Monthly Targets
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Max FB Spend ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 18000"
                    value={targetSpend}
                    onChange={(e) => setTargetSpend(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-[#366ae8] hover:bg-[#2d5bcf] text-white"
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
            <Card className="border-slate-200/60">
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
                        ? "bg-emerald-50"
                        : revenuePaceStatus === "close"
                          ? "bg-amber-50"
                          : "bg-rose-50"
                    }`}
                  >
                    <DollarSign
                      className={`h-5 w-5 ${
                        revenuePaceStatus === "ahead"
                          ? "text-emerald-700"
                          : revenuePaceStatus === "close"
                            ? "text-amber-700"
                            : "text-rose-700"
                      }`}
                    />
                  </div>
                </div>
                {goal.target_revenue && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 rounded-full h-2">
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

            <Card className="border-slate-200/60">
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
                        ? "bg-emerald-50"
                        : "bg-rose-50"
                    }`}
                  >
                    <TrendingUp
                      className={`h-5 w-5 ${
                        Number(goal.actual_profit) >= 0
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    />
                  </div>
                </div>
                {goal.target_profit && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[#366ae8] transition-all"
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

            <Card className="border-slate-200/60">
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
                  <div className="p-2.5 rounded-xl bg-[#366ae8]/8">
                    <Target className="h-5 w-5 text-[#366ae8]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Days Left
                    </p>
                    <p className="text-2xl font-bold mt-1">{daysRemaining}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      of {daysInMonth} days &middot; Margin{" "}
                      {Number(goal.actual_margin_pct).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100">
                    <Calendar className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Site Revenue Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Revenue by Site
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="site"
                      tick={{ fontSize: 12 }}
                      stroke="#94a3b8"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#94a3b8"
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `$${Number(value).toLocaleString()}`,
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#366ae8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="spend"
                      name="FB Spend"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="profit"
                      name="Profit"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Site Data Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Site Performance</CardTitle>
                <div className="flex gap-2">
                  {Object.keys(siteEdits).length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleSaveSites}
                      disabled={savingSites}
                      className="bg-[#366ae8] hover:bg-[#2d5bcf] text-white"
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
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2.5 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Site
                      </th>
                      <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        FB Spend
                      </th>
                      <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Profit
                      </th>
                      <th className="text-right py-2.5 pl-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Margin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {KNOWN_SITES.map((s) => {
                      const siteData = sites.find(
                        (sr) => sr.site === s.abbreviation
                      );
                      const edit = siteEdits[s.abbreviation];
                      const rev = edit?.revenue
                        ? parseFloat(edit.revenue)
                        : Number(siteData?.revenue || 0);
                      const spend = edit?.fb_spend
                        ? parseFloat(edit.fb_spend)
                        : Number(siteData?.fb_spend || 0);
                      const profit = rev - spend;
                      const margin =
                        rev > 0 ? ((rev - spend) / rev) * 100 : 0;

                      return (
                        <tr
                          key={s.abbreviation}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="bg-[#366ae8]/10 text-[#366ae8] text-xs font-semibold"
                              >
                                {s.abbreviation}
                              </Badge>
                              <span className="text-xs text-muted-foreground hidden lg:inline">
                                {s.shortName}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={
                                edit?.revenue ??
                                (siteData?.revenue
                                  ? Number(siteData.revenue).toString()
                                  : "")
                              }
                              onChange={(e) =>
                                setSiteEdits((prev) => ({
                                  ...prev,
                                  [s.abbreviation]: {
                                    ...prev[s.abbreviation],
                                    revenue: e.target.value,
                                    fb_spend:
                                      prev[s.abbreviation]?.fb_spend ??
                                      (siteData?.fb_spend
                                        ? Number(
                                            siteData.fb_spend
                                          ).toString()
                                        : ""),
                                  },
                                }))
                              }
                              className="h-8 text-right text-sm w-28"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={
                                edit?.fb_spend ??
                                (siteData?.fb_spend
                                  ? Number(siteData.fb_spend).toString()
                                  : "")
                              }
                              onChange={(e) =>
                                setSiteEdits((prev) => ({
                                  ...prev,
                                  [s.abbreviation]: {
                                    ...prev[s.abbreviation],
                                    fb_spend: e.target.value,
                                    revenue:
                                      prev[s.abbreviation]?.revenue ??
                                      (siteData?.revenue
                                        ? Number(
                                            siteData.revenue
                                          ).toString()
                                        : ""),
                                  },
                                }))
                              }
                              className="h-8 text-right text-sm w-28"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`font-medium ${
                                profit > 0
                                  ? "text-emerald-700"
                                  : profit < 0
                                    ? "text-rose-700"
                                    : "text-slate-500"
                              }`}
                            >
                              ${profit.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 pl-3 text-right">
                            <span
                              className={`font-medium ${
                                margin > 10
                                  ? "text-emerald-700"
                                  : margin > 0
                                    ? "text-amber-700"
                                    : margin < 0
                                      ? "text-rose-700"
                                      : "text-slate-500"
                              }`}
                            >
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="py-3 pr-4">Total</td>
                      <td className="py-3 px-3 text-right">
                        ${Number(goal.actual_revenue).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        ${Number(goal.actual_fb_spend).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={
                            Number(goal.actual_profit) >= 0
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }
                        >
                          ${Number(goal.actual_profit).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {Number(goal.actual_margin_pct).toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* AI Strategy */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#366ae8]" />
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
                    <Loader2 className="h-8 w-8 animate-spin text-[#366ae8]" />
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
                          ? "bg-emerald-50 text-emerald-700"
                          : strategy.pace_status === "on_track"
                            ? "bg-[#366ae8]/10 text-[#366ae8]"
                            : strategy.pace_status === "behind"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
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
                                  ? "bg-rose-50 text-rose-700"
                                  : action.priority === "medium"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {action.priority}
                            </Badge>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="bg-[#366ae8]/10 text-[#366ae8] text-xs"
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
                            className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/40"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0" />
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
                                  ? "bg-rose-50 text-rose-700"
                                  : flag.severity === "medium"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
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
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
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
