"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import Link from "next/link";
import { Change } from "@/lib/types/changes";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import { format, parseISO } from "date-fns";

interface CalendarViewProps {
  changes: Change[];
}

export function CalendarView({ changes }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const changeDateCounts = useMemo(() => {
    const map = new Map<string, number>();
    changes.forEach((c) => {
      const count = map.get(c.change_date) || 0;
      map.set(c.change_date, count + 1);
    });
    return map;
  }, [changes]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayChanges = changes.filter((c) => c.change_date === selectedDateStr);

  const datesWithChanges = useMemo(
    () => Array.from(changeDateCounts.keys()).map((d) => parseISO(d)),
    [changeDateCounts]
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            modifiers={{ hasChanges: datesWithChanges }}
            modifiersClassNames={{
              hasChanges:
                "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-[#366ae8]",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {format(selectedDate, "MMMM d, yyyy")}
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

                return (
                  <Link
                    key={change.id}
                    href={`/changes/${change.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
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

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {change.campaign_name}
                        {change.site ? ` (${change.site})` : ""}
                        {change.geo ? ` — ${change.geo}` : ""}
                        {change.change_value
                          ? ` ${change.change_value}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {change.impact_verdict ? (
                        <Badge
                          variant="secondary"
                          className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color} text-xs`}
                        >
                          {VERDICT_CONFIG[change.impact_verdict]?.label}
                        </Badge>
                      ) : isPendingReview ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-50 text-amber-700 text-xs"
                        >
                          Review Due
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Logged
                        </Badge>
                      )}
                    </div>
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
