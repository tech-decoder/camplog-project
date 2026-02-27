"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Change } from "@/lib/types/changes";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarViewProps {
  changes: Change[];
}

export function CalendarView({ changes }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const changeDateCounts = useMemo(() => {
    const map = new Map<string, number>();
    changes.forEach((c) => {
      if (c.status === "voided") return;
      const count = map.get(c.change_date) || 0;
      map.set(c.change_date, count + 1);
    });
    return map;
  }, [changes]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayChanges = changes.filter((c) => c.change_date === selectedDateStr);

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar - takes 2 columns */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1,
                    1
                  )
                )
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-base font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1,
                    1
                  )
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Week headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((date, idx) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const count = changeDateCounts.get(dateStr) || 0;
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSelected = isSameDay(date, selectedDate);
              const today = isToday(date);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-colors min-h-[60px] ${
                    !isCurrentMonth
                      ? "text-muted-foreground/40"
                      : isSelected
                        ? "bg-primary text-primary-foreground"
                        : today
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm">{format(date, "d")}</span>
                  {count > 0 && isCurrentMonth && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        }`}
                      />
                      {count > 1 && (
                        <span
                          className={`text-[10px] ${
                            isSelected
                              ? "text-white/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day detail - 1 column */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {format(selectedDate, "MMM d, yyyy")}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {dayChanges.length} change{dayChanges.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {dayChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No changes on this day
            </p>
          ) : (
            <div className="space-y-2">
              {dayChanges.map((change) => {
                const config = ACTION_TYPE_CONFIG[change.action_type];
                const isPause =
                  change.action_type === "pause_campaign" ||
                  change.action_type === "pause_geo";
                const isPendingReview =
                  !isPause &&
                  change.impact_review_due &&
                  !change.impact_reviewed_at;
                const isVoided = change.status === "voided";

                return (
                  <Link
                    key={change.id}
                    href={`/changes/${change.id}`}
                    className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
                      isVoided
                        ? "border-border bg-muted/30 opacity-60"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`${config?.bgColor} ${config?.color} text-xs flex-shrink-0 gap-1`}
                      >
                        {config && (
                          <ActionIcon
                            iconName={config.icon}
                            className="h-3 w-3"
                          />
                        )}
                        {config?.label}
                      </Badge>

                      <div className="flex-shrink-0 ml-auto">
                        {isVoided ? (
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground text-xs"
                          >
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
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs"
                          >
                            Review Due
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <p
                      className={`text-sm font-medium ${isVoided ? "line-through text-muted-foreground" : ""}`}
                    >
                      {change.campaign_name}
                      {change.site ? ` (${change.site})` : ""}
                      {change.geo ? ` — ${change.geo}` : ""}
                      {change.change_value ? ` ${change.change_value}` : ""}
                    </p>

                    {isVoided && change.void_reason && (
                      <p className="text-xs text-muted-foreground italic">
                        {change.void_reason}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
