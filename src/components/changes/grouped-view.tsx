"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Globe } from "lucide-react";
import Link from "next/link";
import { Change } from "@/lib/types/changes";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import { formatDate } from "@/lib/utils/dates";
import {
  SITE_ABBREVIATION_MAP,
  type SiteDefinition,
} from "@/lib/constants/sites";

interface GroupedViewProps {
  changes: Change[];
}

interface SiteGroup {
  site: string;
  siteInfo?: SiteDefinition;
  campaigns: CampaignGroup[];
  totalChanges: number;
}

interface CampaignGroup {
  campaignName: string;
  changes: Change[];
}

export function GroupedView({ changes }: GroupedViewProps) {
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const siteMap = new Map<string, Change[]>();

    changes.forEach((c) => {
      const site = c.site || "Other";
      const existing = siteMap.get(site) || [];
      existing.push(c);
      siteMap.set(site, existing);
    });

    const result: SiteGroup[] = [];
    siteMap.forEach((siteChanges, site) => {
      const campaignMap = new Map<string, Change[]>();
      siteChanges.forEach((c) => {
        const existing = campaignMap.get(c.campaign_name) || [];
        existing.push(c);
        campaignMap.set(c.campaign_name, existing);
      });

      const campaigns: CampaignGroup[] = [];
      campaignMap.forEach((cChanges, name) => {
        campaigns.push({
          campaignName: name,
          changes: cChanges.sort(
            (a, b) =>
              new Date(b.change_date).getTime() -
              new Date(a.change_date).getTime()
          ),
        });
      });

      campaigns.sort((a, b) => b.changes.length - a.changes.length);

      result.push({
        site,
        siteInfo: SITE_ABBREVIATION_MAP[site],
        campaigns,
        totalChanges: siteChanges.length,
      });
    });

    return result.sort((a, b) => b.totalChanges - a.totalChanges);
  }, [changes]);

  // Auto-expand all sites on initial render
  useMemo(() => {
    if (expandedSites.size === 0 && groups.length > 0) {
      setExpandedSites(new Set(groups.map((g) => g.site)));
    }
  }, [groups]);

  function toggleSite(site: string) {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(site)) {
        next.delete(site);
      } else {
        next.add(site);
      }
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No changes found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isExpanded = expandedSites.has(group.site);

        return (
          <Card key={group.site}>
            <CardHeader className="pb-3">
              <button
                onClick={() => toggleSite(group.site)}
                className="flex items-center gap-3 w-full text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}

                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1"
                >
                  {group.site}
                </Badge>

                <div className="flex-1 min-w-0">
                  {group.siteInfo ? (
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      {group.siteInfo.domain}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Unassigned site
                    </span>
                  )}
                </div>

                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {group.totalChanges} change
                  {group.totalChanges !== 1 ? "s" : ""} &middot;{" "}
                  {group.campaigns.length} campaign
                  {group.campaigns.length !== 1 ? "s" : ""}
                </Badge>
              </button>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                {group.campaigns.map((campaign) => (
                  <div key={campaign.campaignName}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-foreground">
                        {campaign.campaignName}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        ({campaign.changes.length})
                      </span>
                    </div>

                    <div className="space-y-1.5 ml-4 border-l-2 border-border/50 pl-3">
                      {campaign.changes.map((change) => {
                        const config =
                          ACTION_TYPE_CONFIG[change.action_type];
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
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${
                              isVoided
                                ? "opacity-60 bg-muted/30"
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
                              <span className={`text-sm text-muted-foreground ${isVoided ? "line-through" : ""}`}>
                                {change.geo ? `${change.geo} ` : ""}
                                {change.change_value || ""}
                              </span>
                              {isVoided && change.void_reason && (
                                <p className="text-xs text-muted-foreground/60 italic truncate">
                                  {change.void_reason}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
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
                                  {
                                    VERDICT_CONFIG[change.impact_verdict]
                                      ?.label
                                  }
                                </Badge>
                              ) : isPendingReview ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs"
                                >
                                  Review Due
                                </Badge>
                              ) : null}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(change.change_date)}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
