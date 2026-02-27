"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Change } from "@/lib/types/changes";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG, TEST_CATEGORIES } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import { formatDate } from "@/lib/utils/dates";

interface TestsViewProps {
  changes: Change[];
}

interface TestGroup {
  category: string;
  label: string;
  changes: Change[];
}

export function TestsView({ changes }: TestsViewProps) {
  const testChanges = useMemo(
    () => changes.filter((c) => c.test_category && c.status !== "voided"),
    [changes]
  );

  const groups = useMemo(() => {
    const categoryMap = new Map<string, Change[]>();

    testChanges.forEach((c) => {
      const cat = c.test_category || "other";
      const existing = categoryMap.get(cat) || [];
      existing.push(c);
      categoryMap.set(cat, existing);
    });

    const result: TestGroup[] = [];
    categoryMap.forEach((catChanges, category) => {
      result.push({
        category,
        label: TEST_CATEGORIES[category]?.label || category,
        changes: catChanges.sort(
          (a, b) =>
            new Date(b.change_date).getTime() -
            new Date(a.change_date).getTime()
        ),
      });
    });

    return result.sort((a, b) => b.changes.length - a.changes.length);
  }, [testChanges]);

  // Stats
  const reviewed = testChanges.filter((c) => c.impact_reviewed_at);
  const confirmed = reviewed.filter((c) => c.impact_verdict === "positive");
  const rejected = reviewed.filter((c) => c.impact_verdict === "negative");

  if (testChanges.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <FlaskConical className="h-6 w-6 text-purple-700" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            No tests tracked yet
          </p>
          <p className="text-sm text-muted-foreground">
            When you log changes with test language (e.g. &quot;testing 9:16 video&quot;), they&apos;ll appear here grouped by category.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Test stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-slate-200/60">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Tests</p>
            <p className="text-xl font-bold mt-0.5">{testChanges.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Reviewed</p>
            <p className="text-xl font-bold mt-0.5">{reviewed.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-medium">Confirmed</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-700">{confirmed.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] text-rose-700 uppercase tracking-wider font-medium">Rejected</p>
            <p className="text-xl font-bold mt-0.5 text-rose-700">{rejected.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped by test category */}
      {groups.map((group) => (
        <Card key={group.category}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-purple-50 text-purple-700 text-sm px-3 py-1 gap-1.5"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                {group.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {group.changes.length} test{group.changes.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {group.changes.map((change) => {
                const config = ACTION_TYPE_CONFIG[change.action_type];
                return (
                  <Link
                    key={change.id}
                    href={`/changes/${change.id}`}
                    className="block p-3.5 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Left: action badge */}
                      <Badge
                        variant="secondary"
                        className={`${config?.bgColor} ${config?.color} text-xs gap-1 shrink-0 mt-0.5`}
                      >
                        {config && <ActionIcon iconName={config.icon} className="h-3 w-3" />}
                        {config?.label}
                      </Badge>

                      {/* Center: hypothesis + campaign */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {change.campaign_name}
                          {change.geo ? ` (${change.geo})` : ""}
                          {change.change_value ? ` ${change.change_value}` : ""}
                        </p>
                        {change.hypothesis && (
                          <div className="flex items-start gap-1.5 mt-1.5">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground italic">
                              {change.hypothesis}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: verdict + date */}
                      <div className="flex items-center gap-2 shrink-0">
                        {change.impact_verdict ? (
                          <Badge
                            variant="secondary"
                            className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color} text-xs gap-1`}
                          >
                            {change.impact_verdict === "positive" ? "Confirmed" :
                             change.impact_verdict === "negative" ? "Rejected" :
                             VERDICT_CONFIG[change.impact_verdict]?.label}
                          </Badge>
                        ) : change.impact_review_due && !change.impact_reviewed_at ? (
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs">
                            Awaiting Results
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Logged
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(change.change_date)}
                        </span>
                      </div>
                    </div>

                    {/* Impact summary for reviewed tests */}
                    {change.impact_summary && (
                      <div className="mt-2 ml-[calc(theme(spacing.3)+theme(spacing.1))] pl-3 border-l-2 border-muted">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {change.impact_summary}
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
