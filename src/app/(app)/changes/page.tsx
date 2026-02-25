"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Change } from "@/lib/types/changes";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import { formatDate, formatRelative } from "@/lib/utils/dates";

export default function ChangesPage() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");

  useEffect(() => {
    fetchChanges();
  }, [actionFilter, reviewFilter]);

  async function fetchChanges() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (actionFilter !== "all") params.set("action_type", actionFilter);
      if (reviewFilter !== "all") params.set("review_status", reviewFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/changes?${params}`);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchChanges();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reviewFilter} onValueChange={setReviewFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Review status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Changes List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Campaign Changes ({changes.length})
          </CardTitle>
          <Link href="/chat">
            <Button size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Log Change
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading changes...
            </p>
          ) : changes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-3">
                No changes found
              </p>
              <Link href="/chat">
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Log your first change
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {changes.map((change) => {
                const config = ACTION_TYPE_CONFIG[change.action_type];
                const hasPreMetrics =
                  Object.keys(change.pre_metrics || {}).length > 0;
                const isPause =
                  change.action_type === "pause_campaign" || change.action_type === "pause_geo";
                const isPendingReview =
                  !isPause && change.impact_review_due && !change.impact_reviewed_at;

                return (
                  <Link
                    key={change.id}
                    href={`/changes/${change.id}`}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <Badge
                      variant="secondary"
                      className={`${config?.bgColor} ${config?.color} text-xs flex-shrink-0 gap-1`}
                    >
                      {config && <ActionIcon iconName={config.icon} className="h-3 w-3" />}
                      {config?.label}
                    </Badge>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {change.campaign_name}
                        {change.site ? ` (${change.site})` : ""}
                        {change.geo ? ` — ${change.geo}` : ""}
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

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasPreMetrics && change.pre_metrics.margin_pct != null && (
                        <span className="text-xs text-muted-foreground">
                          {Number(parseFloat(String(change.pre_metrics.margin_pct))).toFixed(1)}% margin
                        </span>
                      )}

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
                          className="bg-[#366ae8]/8 text-[#366ae8] text-xs"
                        >
                          Review Due
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
