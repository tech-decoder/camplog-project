"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  TrendingUp,
  Clock,
  Activity,
  ArrowRight,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Change } from "@/lib/types/changes";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import { formatRelative } from "@/lib/utils/dates";

export default function DashboardPage() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChanges();
  }, []);

  async function fetchChanges() {
    try {
      const res = await fetch("/api/changes?limit=20");
      if (res.ok) {
        const data = await res.json();
        setChanges(data.changes || []);
      }
    } catch (err) {
      console.error("Failed to fetch changes:", err);
    } finally {
      setLoading(false);
    }
  }

  const todayChanges = changes.filter(
    (c) => c.change_date === new Date().toISOString().split("T")[0]
  );

  const pendingReviews = changes.filter(
    (c) =>
      c.impact_review_due &&
      !c.impact_reviewed_at &&
      c.action_type !== "pause_campaign" &&
      c.action_type !== "pause_geo"
  );

  const reviewedChanges = changes.filter((c) => c.impact_reviewed_at);
  const avgMargin =
    reviewedChanges.length > 0
      ? reviewedChanges.reduce(
          (sum, c) => sum + (c.post_metrics?.margin_pct || 0),
          0
        ) / reviewedChanges.length
      : null;

  const stats = [
    {
      label: "Changes Today",
      value: todayChanges.length,
      icon: Activity,
      color: "text-[#366ae8]",
      bgColor: "bg-[#366ae8]/8",
    },
    {
      label: "Pending Reviews",
      value: pendingReviews.length,
      icon: Clock,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
    },
    {
      label: "Avg Reviewed Margin",
      value: avgMargin !== null ? `${avgMargin.toFixed(1)}%` : "--",
      icon: TrendingUp,
      color: "text-[#366ae8]",
      bgColor: "bg-[#366ae8]/8",
    },
    {
      label: "Total Changes",
      value: changes.length,
      icon: BarChart3,
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200/60">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold mt-1 text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Recent Changes */}
        <Card className="lg:col-span-3 border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Recent Changes</CardTitle>
            <Link href="/changes">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-[#366ae8] animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading changes...</p>
                </div>
              </div>
            ) : changes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-[#366ae8]/8 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-[#366ae8]" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  No changes logged yet
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start logging campaign changes through chat
                </p>
                <Link href="/chat">
                  <Button size="sm" className="bg-[#366ae8] hover:bg-[#2d5bcf] text-white">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Log your first change
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {changes.slice(0, 8).map((change) => {
                  const config = ACTION_TYPE_CONFIG[change.action_type];
                  return (
                    <Link
                      key={change.id}
                      href={`/changes/${change.id}`}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group"
                    >
                      <Badge
                        variant="secondary"
                        className={`${config?.bgColor} ${config?.color} text-xs gap-1 shrink-0`}
                      >
                        {config && <ActionIcon iconName={config.icon} className="h-3 w-3" />}
                        {config?.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {change.campaign_name}
                          {change.geo ? ` (${change.geo})` : ""}
                          {change.change_value
                            ? ` ${change.change_value}`
                            : ""}
                        </p>
                        {change.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {change.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(change.created_at)}
                        </span>
                        {change.impact_verdict && (
                          <Badge
                            variant="secondary"
                            className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color} text-xs`}
                          >
                            {VERDICT_CONFIG[change.impact_verdict]?.label}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card className="lg:col-span-2 border-slate-200/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Pending Reviews</CardTitle>
              {pendingReviews.length > 0 && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs">
                  {pendingReviews.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingReviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-5 w-5 text-amber-700" />
                </div>
                <p className="text-sm text-muted-foreground">
                  All caught up
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingReviews.slice(0, 5).map((change) => {
                  const config = ACTION_TYPE_CONFIG[change.action_type];
                  return (
                    <Link
                      key={change.id}
                      href={`/changes/${change.id}`}
                      className="block p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        {config && (
                          <div className={`p-1.5 rounded-lg ${config.bgColor} mt-0.5`}>
                            <ActionIcon iconName={config.icon} className={`h-3.5 w-3.5 ${config.color}`} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {change.campaign_name}
                            {change.geo ? ` (${change.geo})` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Changed {formatRelative(change.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2.5 w-full text-xs h-8 border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        Review Now
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
