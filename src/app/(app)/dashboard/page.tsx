"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Megaphone,
  List,
  DollarSign,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Change } from "@/lib/types/changes";
import { useProfile } from "@/components/providers/profile-provider";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";

const hubCards = [
  {
    title: "Generate",
    description: "Create ad creatives and landing pages with AI",
    icon: Sparkles,
    href: "/generate",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    borderHover: "hover:border-purple-500/30",
  },
  {
    title: "Campaigns",
    description: "View and manage your active campaigns",
    icon: Megaphone,
    href: "/campaigns",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderHover: "hover:border-primary/30",
  },
  {
    title: "Changes",
    description: "Track optimizations and measure impact",
    icon: List,
    href: "/changes",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderHover: "hover:border-emerald-500/30",
  },
];

interface GoalData {
  actual_revenue: number | null;
  actual_profit: number | null;
  actual_margin_pct: number | null;
  target_revenue: number | null;
  target_profit: number | null;
  target_margin_pct: number | null;
}

export default function DashboardPage() {
  const { profile } = useProfile();
  const [changes, setChanges] = useState<Change[]>([]);
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchChanges(), fetchGoal()]).finally(() =>
      setLoading(false)
    );
  }, []);

  async function fetchChanges() {
    try {
      const res = await fetch("/api/changes?limit=50");
      if (res.ok) {
        const data = await res.json();
        setChanges(data.changes || []);
      }
    } catch (err) {
      console.error("Failed to fetch changes:", err);
    }
  }

  async function fetchGoal() {
    try {
      const month = format(new Date(), "yyyy-MM");
      const res = await fetch(`/api/goals?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        if (data.goals?.length > 0) setGoal(data.goals[0]);
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    }
  }

  const today = new Date();
  const firstName =
    profile?.nickname || profile?.full_name?.split(" ")[0] || "there";

  // Pending reviews count (for Changes hub card badge)
  const pendingReviews = changes.filter(
    (c) =>
      c.impact_review_due &&
      !c.impact_reviewed_at &&
      c.action_type !== "pause_campaign" &&
      c.action_type !== "pause_geo" &&
      c.status !== "voided"
  );

  // Goal data extraction
  const revenue = goal?.actual_revenue != null ? Number(goal.actual_revenue) : null;
  const targetRevenue = goal?.target_revenue != null ? Number(goal.target_revenue) : null;
  const marginPct = goal?.actual_margin_pct != null ? Number(goal.actual_margin_pct) : null;
  const targetMarginPct = goal?.target_margin_pct != null ? Number(goal.target_margin_pct) : null;

  // Time calculations
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  // Goal progress
  const goalProgress =
    revenue !== null && targetRevenue && targetRevenue > 0
      ? Math.min((revenue / targetRevenue) * 100, 999)
      : null;

  // Pace status — compares actual vs expected progress through the month
  const expectedProgress =
    targetRevenue && targetRevenue > 0 ? (dayOfMonth / daysInMonth) * 100 : null;
  const targetExceeded = revenue !== null && targetRevenue !== null && revenue >= targetRevenue;

  type PaceStatus = "on_track" | "behind" | "at_risk" | "exceeded";
  const paceStatus: PaceStatus | null = (() => {
    if (goalProgress === null || expectedProgress === null) return null;
    if (goalProgress >= 100) return "exceeded";
    if (dayOfMonth <= 1) return "on_track";
    if (goalProgress >= expectedProgress) return "on_track";
    if (goalProgress >= expectedProgress * 0.85) return "behind";
    return "at_risk";
  })();

  const paceConfig: Record<PaceStatus, { bar: string; bg: string; text: string; label: string }> = {
    exceeded: { bar: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "Target exceeded" },
    on_track: { bar: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "On track" },
    behind:   { bar: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",     label: "Behind pace" },
    at_risk:  { bar: "bg-rose-500",    bg: "bg-rose-500/10",    text: "text-rose-700 dark:text-rose-400",       label: "Falling behind" },
  };

  // Goal progress subtitle with contextual copywriting
  const goalSubtitle = (() => {
    if (!paceStatus || goalProgress === null) return null;
    switch (paceStatus) {
      case "exceeded": return `Target exceeded · ${daysLeft} days left`;
      case "on_track": return `On track · ${daysLeft} days remaining`;
      case "behind":   return `Behind pace · ${daysLeft} days to catch up`;
      case "at_risk":  return `Falling behind · need to accelerate`;
    }
  })();

  // Daily revenue needed to hit target
  const dailyNeeded =
    daysLeft > 0 && revenue !== null && targetRevenue && targetRevenue > 0
      ? Math.max((targetRevenue - revenue) / daysLeft, 0)
      : null;

  // Margin coloring helper (reuses goals page pattern)
  const marginColor = (v: number) =>
    v > 10 ? "text-emerald-700 dark:text-emerald-400"
    : v > 0 ? "text-amber-700 dark:text-amber-400"
    : v < 0 ? "text-rose-700 dark:text-rose-400"
    : "text-muted-foreground/60";

  return (
    <PageShell>
      <GradientPageHeader
        icon={LayoutDashboard}
        title={`Welcome back, ${firstName}.`}
        description="Pick where you want to work."
      />

      {/* 3 Hub Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hubCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card
              className={`hover-card-glow border-border/60 ${card.borderHover} transition-all cursor-pointer h-full`}
            >
              <CardContent className="pt-6 pb-5 px-5">
                <div
                  className={`h-10 w-10 rounded-lg ${card.bgColor} flex items-center justify-center mb-4`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{card.title}</h3>
                  {card.href === "/changes" && pendingReviews.length > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] px-1.5 h-5">
                      {pendingReviews.length} to review
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {card.description}
                </p>
                <div className="flex items-center gap-1 mt-4 text-sm text-primary font-medium">
                  Go to {card.title}
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* === Performance Section === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Current Performance</h2>
            <p className="text-sm text-muted-foreground">
              Here&apos;s how your campaigns are performing this month.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Revenue */}
          <Card className="hover-card-glow border-border/60">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground font-medium">Revenue</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">
                    {loading ? "--" : revenue !== null ? `$${revenue.toLocaleString()}` : "--"}
                  </p>
                  {!loading && (
                    <>
                      {!goal ? (
                        <Link href="/goals" className="text-xs text-primary hover:underline">
                          Set a goal →
                        </Link>
                      ) : targetRevenue ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          of ${targetRevenue.toLocaleString()} target
                        </p>
                      ) : null}
                      {marginPct !== null && (
                        <p className={`text-xs mt-1 ${marginColor(marginPct)}`}>
                          Margin: {marginPct.toFixed(1)}%
                          {targetMarginPct !== null && (
                            <span className="text-muted-foreground"> of {targetMarginPct.toFixed(0)}% target</span>
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Revenue Goal */}
          <Card className="hover-card-glow border-border/60">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground font-medium">Revenue Goal</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">
                    {loading ? "--" : goalProgress !== null ? `${goalProgress.toFixed(0)}%` : "--"}
                  </p>
                  {!loading && goalSubtitle && paceStatus && (
                    <p className={`text-xs mt-0.5 ${paceConfig[paceStatus].text}`}>
                      {goalSubtitle}
                    </p>
                  )}
                  {!loading && goalProgress != null && goalProgress >= 0 && paceStatus && (
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full transition-all ${paceConfig[paceStatus].bar}`}
                        style={{ width: `${Math.min(goalProgress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${paceStatus ? paceConfig[paceStatus].bg : "bg-primary/10"}`}>
                  <Target className={`h-5 w-5 ${paceStatus ? paceConfig[paceStatus].text : "text-primary"}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Daily Needed (gradient border) */}
          <div className={`rounded-xl p-[1px] ${targetExceeded ? "bg-gradient-to-br from-emerald-500/30 via-emerald-400/30 to-emerald-500/30" : "bg-gradient-to-br from-primary/30 via-purple-500/30 to-primary/30"}`}>
            <Card className="hover-card-glow border-0 rounded-[11px] h-full">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">Daily Needed</p>
                    <p className="text-2xl font-bold mt-1 text-foreground">
                      {loading ? "--" : targetExceeded ? (
                        "Target hit!"
                      ) : dailyNeeded !== null ? (
                        `$${dailyNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      ) : daysLeft === 0 && goalProgress !== null ? (
                        "Last day!"
                      ) : (
                        "--"
                      )}
                    </p>
                    {!loading && (
                      <>
                        {targetExceeded ? (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                            {daysLeft} days left to grow beyond target
                          </p>
                        ) : dailyNeeded !== null ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            per day to hit target
                          </p>
                        ) : !goal ? (
                          <Link href="/goals" className="text-xs text-primary hover:underline">
                            Set a goal →
                          </Link>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${targetExceeded ? "bg-emerald-500/10" : "bg-purple-500/10"}`}>
                    <Zap className={`h-5 w-5 ${targetExceeded ? "text-emerald-700 dark:text-emerald-400" : "text-purple-600 dark:text-purple-400"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
