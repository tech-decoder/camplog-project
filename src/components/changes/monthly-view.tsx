"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Change } from "@/lib/types/changes";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachWeekOfInterval,
  endOfWeek,
  startOfWeek,
} from "date-fns";

interface MonthlyViewProps {
  changes: Change[];
}

export function MonthlyView({ changes }: MonthlyViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthStr = format(monthStart, "yyyy-MM");

  const monthChanges = useMemo(() => {
    const startStr = format(monthStart, "yyyy-MM-dd");
    const endStr = format(monthEnd, "yyyy-MM-dd");
    return changes.filter(
      (c) => c.change_date >= startStr && c.change_date <= endStr
    );
  }, [changes, monthStart, monthEnd]);

  // Group by week
  const weekStarts = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );

  const weekGroups = useMemo(() => {
    return weekStarts.map((ws) => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const startStr = format(ws, "yyyy-MM-dd");
      const endStr = format(we, "yyyy-MM-dd");
      const weekChanges = monthChanges.filter(
        (c) => c.change_date >= startStr && c.change_date <= endStr
      );

      // Group by site within week
      const siteMap = new Map<string, Change[]>();
      weekChanges.forEach((c) => {
        const site = c.site || "Other";
        const existing = siteMap.get(site) || [];
        existing.push(c);
        siteMap.set(site, existing);
      });

      const siteGroups = Array.from(siteMap.entries())
        .map(([site, changes]) => ({ site, changes }))
        .sort((a, b) => b.changes.length - a.changes.length);

      return { weekStart: ws, weekEnd: we, changes: weekChanges, siteGroups };
    });
  }, [weekStarts, monthChanges]);

  const monthStats = useMemo(() => {
    const active = monthChanges.filter((c) => c.status !== "voided");
    const positive = active.filter((c) => c.impact_verdict === "positive").length;
    const negative = active.filter((c) => c.impact_verdict === "negative").length;
    const reviewed = active.filter((c) => c.impact_reviewed_at).length;
    const sites = new Set(active.map((c) => c.site).filter(Boolean)).size;
    return { total: active.length, positive, negative, reviewed, sites };
  }, [monthChanges]);

  return (
    <div className="space-y-4">
      {/* Month navigation + summary */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-sm font-semibold">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge variant="secondary" className="text-xs">
                {monthStats.total} changes
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {monthStats.sites} sites
              </Badge>
              {monthStats.positive > 0 && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">
                  {monthStats.positive} positive
                </Badge>
              )}
              {monthStats.negative > 0 && (
                <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
                  {monthStats.negative} negative
                </Badge>
              )}
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                {monthStats.reviewed} reviewed
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week-by-week breakdown */}
      {weekGroups.map(({ weekStart: ws, weekEnd: we, changes: weekChanges, siteGroups }) => (
        <Card key={ws.toISOString()} className={weekChanges.length === 0 ? "opacity-50" : ""}>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                Week of {format(ws, "MMM d")} &ndash; {format(we, "MMM d")}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {weekChanges.length} change{weekChanges.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {weekChanges.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No changes this week</p>
            ) : (
              <div className="space-y-3">
                {siteGroups.map(({ site, changes: siteChanges }) => (
                  <div key={site}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary text-xs font-semibold"
                      >
                        {site}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {siteChanges.length} change{siteChanges.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1 ml-3 border-l-2 border-border/50 pl-3">
                      {siteChanges.map((change) => {
                        const config = ACTION_TYPE_CONFIG[change.action_type];
                        const isVoided = change.status === "voided";

                        return (
                          <Link
                            key={change.id}
                            href={`/changes/${change.id}`}
                            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                              isVoided ? "opacity-60" : "hover:bg-accent"
                            }`}
                          >
                            <Badge
                              variant="secondary"
                              className={`${config?.bgColor} ${config?.color} text-xs gap-1 flex-shrink-0`}
                            >
                              {config && (
                                <ActionIcon
                                  iconName={config.icon}
                                  className="h-3 w-3"
                                />
                              )}
                              {config?.label}
                            </Badge>
                            <span className={`text-sm flex-1 min-w-0 truncate ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                              {change.campaign_name}
                              {change.geo ? ` — ${change.geo}` : ""}
                              {change.change_value ? ` ${change.change_value}` : ""}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {format(new Date(change.change_date), "MMM d")}
                            </span>
                            {isVoided ? (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs flex-shrink-0">
                                Voided
                              </Badge>
                            ) : change.impact_verdict ? (
                              <Badge
                                variant="secondary"
                                className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color} text-xs flex-shrink-0`}
                              >
                                {VERDICT_CONFIG[change.impact_verdict]?.label}
                              </Badge>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
