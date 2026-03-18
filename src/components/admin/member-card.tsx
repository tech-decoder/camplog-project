"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TeamMemberStats, GoalStatus } from "@/lib/types/admin";
import { formatDollar, formatPercent } from "@/lib/utils/metrics";
import { TrendingUp, TrendingDown, Minus, Activity, CheckSquare } from "lucide-react";

// ── Goal status config ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<GoalStatus, { label: string; dot: string; text: string }> = {
  ahead:   { label: "Ahead",    dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  on_track:{ label: "On track", dot: "bg-primary",     text: "text-primary" },
  behind:  { label: "Behind",   dot: "bg-orange-500",  text: "text-orange-600 dark:text-orange-400" },
  no_goal: { label: "No goal",  dot: "bg-slate-300 dark:bg-slate-600", text: "text-muted-foreground" },
};

// ── Progress bar colour ─────────────────────────────────────────────────────
function progressColor(pct: number): string {
  if (pct >= 80)  return "bg-emerald-500";
  if (pct >= 50)  return "bg-amber-500";
  if (pct > 0)    return "bg-red-500";
  return "bg-muted-foreground/20";
}

// ── Avatar initials + colour ────────────────────────────────────────────────
const AVATAR_COLOURS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-rose-500",  "bg-amber-500",  "bg-cyan-500",
  "bg-pink-500",  "bg-indigo-500",
];

function avatarColor(email: string): string {
  let hash = 0;
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

function initials(member: TeamMemberStats): string {
  const name = member.nickname ?? member.full_name ?? member.email;
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface MemberCardProps {
  member: TeamMemberStats;
}

export function MemberCard({ member }: MemberCardProps) {
  const status       = STATUS_CONFIG[member.goal_status];
  const displayName  = member.nickname ?? member.full_name ?? member.email.split("@")[0];

  // Revenue progress percentage (relative to pace target)
  const revenuePct = member.target_revenue && member.target_revenue > 0
    ? Math.min(100, Math.round(((member.actual_revenue ?? 0) / member.target_revenue) * 100))
    : null;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow">

      {/* Top accent bar — goal status colour */}
      <div className={cn("h-1 w-full flex-shrink-0", status.dot)} />

      <div className="p-5 flex flex-col gap-4">

        {/* ── Identity ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold",
              avatarColor(member.email)
            )}
          >
            {initials(member)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
          {/* Goal status pill */}
          <div className="ml-auto flex-shrink-0 flex items-center gap-1.5">
            <div className={cn("h-2 w-2 rounded-full flex-shrink-0", status.dot)} />
            <span className={cn("text-xs font-medium", status.text)}>{status.label}</span>
          </div>
        </div>

        {/* ── Revenue progress ─────────────────────────────────────── */}
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-xs text-muted-foreground font-medium">Revenue</span>
            <div className="text-right">
              <span className="text-base font-bold">
                {member.actual_revenue != null
                  ? formatDollar(member.actual_revenue)
                  : <span className="text-muted-foreground text-sm">—</span>
                }
              </span>
              {member.target_revenue && (
                <span className="text-xs text-muted-foreground ml-1">
                  / {formatDollar(member.target_revenue)}
                </span>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            {revenuePct !== null ? (
              <div
                className={cn("h-full rounded-full transition-all", progressColor(revenuePct))}
                style={{ width: `${revenuePct}%` }}
              />
            ) : (
              <div className="h-full rounded-full bg-muted-foreground/20 w-full" />
            )}
          </div>
          {revenuePct !== null && (
            <p className="text-[11px] text-muted-foreground mt-0.5 text-right">
              {revenuePct}% of target
            </p>
          )}
        </div>

        {/* ── Metric chips ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <MetricChip
            label="Profit"
            value={member.actual_profit != null ? formatDollar(member.actual_profit) : "—"}
            positive={member.actual_profit != null ? member.actual_profit >= 0 : null}
          />
          <MetricChip
            label="Margin"
            value={member.actual_margin_pct != null ? formatPercent(member.actual_margin_pct) : "—"}
            positive={member.actual_margin_pct != null ? member.actual_margin_pct >= 0 : null}
          />
          <MetricChip
            label="FB Spend"
            value={member.actual_fb_spend != null ? formatDollar(member.actual_fb_spend) : "—"}
            positive={null}
          />
        </div>

        {/* ── Sites ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-0.5">
            Sites{member.site_count > 0 ? ` (${member.site_count})` : ""}:
          </span>
          {member.sites.length > 0 ? (
            <>
              {member.sites.slice(0, 6).map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 font-semibold uppercase"
                >
                  {s}
                </Badge>
              ))}
              {member.sites.length > 6 && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  +{member.sites.length - 6} more
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">None added</span>
          )}
        </div>

        {/* ── Activity row ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 pt-1 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span>
              <span className="font-semibold text-foreground">{member.changes_this_month}</span>
              {" "}changes
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>
              <span className="font-semibold text-foreground">{member.open_tasks}</span>
              {" "}open tasks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small metric chip ───────────────────────────────────────────────────────
function MetricChip({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean | null;
}) {
  const Icon = positive === null
    ? Minus
    : positive
      ? TrendingUp
      : TrendingDown;
  const colour = positive === null
    ? "text-muted-foreground"
    : positive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-lg bg-muted/50 px-2.5 py-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <div className={cn("flex items-center gap-1", colour)}>
        <Icon className="h-3 w-3 flex-shrink-0" />
        <span className="text-xs font-semibold truncate">{value}</span>
      </div>
    </div>
  );
}
