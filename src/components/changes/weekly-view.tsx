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
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  isToday,
} from "date-fns";

interface WeeklyViewProps {
  changes: Change[];
}

export function WeeklyView({ changes }: WeeklyViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekChanges = useMemo(() => {
    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");
    return changes.filter(
      (c) => c.change_date >= startStr && c.change_date <= endStr
    );
  }, [changes, weekStart, weekEnd]);

  const dayGroups = useMemo(() => {
    return weekDays.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayChanges = weekChanges.filter((c) => c.change_date === dateStr);
      return { date: day, dateStr, changes: dayChanges };
    });
  }, [weekDays, weekChanges]);

  const weekStats = useMemo(() => {
    const active = weekChanges.filter((c) => c.status !== "voided");
    const positive = active.filter((c) => c.impact_verdict === "positive").length;
    const negative = active.filter((c) => c.impact_verdict === "negative").length;
    const pending = active.filter(
      (c) =>
        !c.impact_reviewed_at &&
        c.impact_review_due &&
        c.action_type !== "pause_campaign" &&
        c.action_type !== "pause_geo"
    ).length;
    return { total: active.length, positive, negative, pending };
  }, [weekChanges]);

  return (
    <div className="space-y-4">
      {/* Week navigation + stats */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h3 className="text-sm font-semibold">
                  {format(weekStart, "MMM d")} &ndash;{" "}
                  {format(weekEnd, "MMM d, yyyy")}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {weekStats.total} changes
              </Badge>
              {weekStats.positive > 0 && (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                  {weekStats.positive} positive
                </Badge>
              )}
              {weekStats.negative > 0 && (
                <Badge variant="secondary" className="bg-rose-50 text-rose-700 text-xs">
                  {weekStats.negative} negative
                </Badge>
              )}
              {weekStats.pending > 0 && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs">
                  {weekStats.pending} pending
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day-by-day breakdown */}
      <div className="space-y-3">
        {dayGroups.map(({ date, dateStr, changes: dayChanges }) => {
          const today = isToday(date);
          const hasChanges = dayChanges.length > 0;

          return (
            <Card
              key={dateStr}
              className={!hasChanges ? "opacity-50" : today ? "border-[#366ae8]/30" : ""}
            >
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${today ? "text-[#366ae8]" : ""}`}>
                      {format(date, "EEEE")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(date, "MMM d")}
                    </span>
                    {today && (
                      <Badge variant="secondary" className="bg-[#366ae8]/10 text-[#366ae8] text-[10px] px-1.5 py-0">
                        Today
                      </Badge>
                    )}
                  </div>
                  {hasChanges && (
                    <span className="text-xs text-muted-foreground">
                      {dayChanges.length} change{dayChanges.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {!hasChanges ? (
                  <p className="text-xs text-muted-foreground py-1">
                    No changes
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {dayChanges.map((change) => {
                      const config = ACTION_TYPE_CONFIG[change.action_type];
                      const isVoided = change.status === "voided";
                      const isPause =
                        change.action_type === "pause_campaign" ||
                        change.action_type === "pause_geo";
                      const isPendingReview =
                        !isPause &&
                        change.impact_review_due &&
                        !change.impact_reviewed_at;

                      return (
                        <Link
                          key={change.id}
                          href={`/changes/${change.id}`}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${
                            isVoided
                              ? "opacity-60 bg-slate-50/50"
                              : "hover:bg-accent"
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
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                              {change.campaign_name}
                              {change.site ? ` (${change.site})` : ""}
                              {change.geo ? ` — ${change.geo}` : ""}
                              {change.change_value ? ` ${change.change_value}` : ""}
                            </span>
                          </div>
                          <div className="flex-shrink-0">
                            {isVoided ? (
                              <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-xs">
                                Voided
                              </Badge>
                            ) : change.impact_verdict ? (
                              <Badge
                                variant="secondary"
                                className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color} text-xs`}
                              >
                                {VERDICT_CONFIG[change.impact_verdict]?.label}
                              </Badge>
                            ) : isPendingReview ? (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs">
                                Review Due
                              </Badge>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
