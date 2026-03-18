"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TeamMemberStats, GoalStatus } from "@/lib/types/admin";
import { formatDollar, formatPercent } from "@/lib/utils/metrics";
import { TrendingUp, TrendingDown, Minus, Activity, CheckSquare, Globe } from "lucide-react";

// ── Goal status config ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<GoalStatus, {
  label: string; bar: string; dot: string; pill: string;
}> = {
  ahead:   { label: "Ahead",    bar: "bg-emerald-500", dot: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  on_track:{ label: "On track", bar: "bg-primary",     dot: "bg-primary",     pill: "bg-primary/10 text-primary border-primary/25" },
  behind:  { label: "Behind",   bar: "bg-orange-500",  dot: "bg-orange-500",  pill: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
  no_goal: { label: "No goal",  bar: "bg-slate-300 dark:bg-slate-600", dot: "bg-slate-400", pill: "bg-muted text-muted-foreground border-border" },
};

// ── Progress bar colour by completion % ────────────────────────────────────
function progressColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

// ── Deterministic avatar background ────────────────────────────────────────
const AVATAR_COLOURS = [
  "bg-blue-500",   "bg-violet-500", "bg-emerald-500",
  "bg-rose-500",   "bg-amber-500",  "bg-cyan-500",
  "bg-pink-500",   "bg-indigo-500",
];
function avatarColor(email: string): string {
  let hash = 0;
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}
function initials(member: TeamMemberStats): string {
  const name  = member.nickname ?? member.full_name ?? member.email;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Component ───────────────────────────────────────────────────────────────
interface MemberCardProps { member: TeamMemberStats }

export function MemberCard({ member }: MemberCardProps) {
  const status      = STATUS_CONFIG[member.goal_status];
  const displayName = member.nickname ?? member.full_name ?? member.email.split("@")[0];

  const revenuePct = member.target_revenue && member.target_revenue > 0
    ? Math.min(100, Math.round(((member.actual_revenue ?? 0) / member.target_revenue) * 100))
    : null;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200">

      {/* ── Status accent bar (4px) ──────────────────────────────────── */}
      <div className={cn("h-1.5 w-full flex-shrink-0", status.bar)} />

      {/* ── Header: avatar + identity + status pill ──────────────────── */}
      <div className="px-6 pt-5 pb-4 flex items-start gap-4 border-b border-border/60">
        {/* Avatar — real image or fallback initials */}
        <div className="relative flex-shrink-0">
          {member.avatar_url ? (
            <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-border">
              <Image
                src={member.avatar_url}
                alt={displayName}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center text-white text-base font-bold ring-2 ring-border/40",
              avatarColor(member.email)
            )}>
              {initials(member)}
            </div>
          )}
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-tight truncate">{displayName}</p>
          <p className="text-sm text-muted-foreground truncate mt-0.5">{member.email}</p>
        </div>

        {/* Goal status pill */}
        <Badge
          variant="outline"
          className={cn("flex-shrink-0 text-xs font-medium h-6 px-2.5 gap-1.5", status.pill)}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", status.dot)} />
          {status.label}
        </Badge>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">

        {/* ── Revenue section ──────────────────────────────────────── */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Revenue
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums">
                {member.actual_revenue != null
                  ? formatDollar(member.actual_revenue)
                  : <span className="text-muted-foreground text-base font-normal">No data</span>
                }
              </span>
              {member.target_revenue && (
                <span className="text-sm text-muted-foreground">
                  / {formatDollar(member.target_revenue)}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            {revenuePct !== null ? (
              <div
                className={cn("h-full rounded-full transition-all duration-500", progressColor(revenuePct))}
                style={{ width: `${revenuePct}%` }}
              />
            ) : (
              <div className="h-full rounded-full bg-muted-foreground/15 w-full" />
            )}
          </div>

          {revenuePct !== null && (
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-xs text-muted-foreground">
                Progress toward target
              </span>
              <span className={cn(
                "text-xs font-semibold",
                revenuePct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                revenuePct >= 50 ? "text-amber-600 dark:text-amber-400" :
                "text-red-600 dark:text-red-400"
              )}>
                {revenuePct}%
              </span>
            </div>
          )}
        </div>

        {/* ── Profit section ───────────────────────────────────────── */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Profit
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "text-xl font-bold tabular-nums",
                member.actual_profit != null && member.actual_profit < 0
                  ? "text-red-600 dark:text-red-400"
                  : member.actual_profit != null && member.actual_profit > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ""
              )}>
                {member.actual_profit != null
                  ? formatDollar(member.actual_profit)
                  : <span className="text-muted-foreground text-base font-normal">No data</span>
                }
              </span>
              {member.target_profit && (
                <span className="text-sm text-muted-foreground">
                  / {formatDollar(member.target_profit)}
                </span>
              )}
            </div>
          </div>

          {/* Profit progress bar */}
          {(() => {
            const profitPct = member.target_profit && member.target_profit > 0
              ? Math.min(100, Math.round(((member.actual_profit ?? 0) / member.target_profit) * 100))
              : null;
            return (
              <>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  {profitPct !== null ? (
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", progressColor(profitPct))}
                      style={{ width: `${Math.max(0, profitPct)}%` }}
                    />
                  ) : (
                    <div className="h-full rounded-full bg-muted-foreground/15 w-full" />
                  )}
                </div>
                {profitPct !== null && (
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs text-muted-foreground">Progress toward target</span>
                    <span className={cn(
                      "text-xs font-semibold",
                      profitPct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                      profitPct >= 50 ? "text-amber-600 dark:text-amber-400" :
                      "text-red-600 dark:text-red-400"
                    )}>
                      {profitPct}%
                    </span>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* ── Margin + FB Spend chips ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            label="Margin"
            value={member.actual_margin_pct != null ? formatPercent(member.actual_margin_pct) : "—"}
            positive={member.actual_margin_pct != null ? member.actual_margin_pct >= 0 : null}
          />
          <MetricTile
            label="FB Spend"
            value={member.actual_fb_spend != null ? formatDollar(member.actual_fb_spend) : "—"}
            positive={null}
          />
        </div>

        {/* ── Sites section ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sites{member.site_count > 0 ? ` · ${member.site_count}` : ""}
            </span>
          </div>
          {member.sites.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {member.sites.slice(0, 7).map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 font-semibold uppercase tracking-wide"
                >
                  {s}
                </Badge>
              ))}
              {member.sites.length > 7 && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-muted-foreground">
                  +{member.sites.length - 7} more
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sites added</p>
          )}
        </div>

        {/* ── Activity footer ──────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <ActivityStat icon={Activity} value={member.changes_this_month} label="changes" />
          <div className="h-4 w-px bg-border" />
          <ActivityStat icon={CheckSquare} value={member.open_tasks} label="open tasks" />
        </div>
      </div>
    </div>
  );
}

// ── Metric tile ─────────────────────────────────────────────────────────────
function MetricTile({
  label, value, positive,
}: { label: string; value: string; positive: boolean | null }) {
  const Icon = positive === null ? Minus : positive ? TrendingUp : TrendingDown;
  const valueClass = positive === null
    ? "text-foreground"
    : positive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-xl bg-muted/40 border border-border/50 px-3 py-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <div className={cn("flex items-center justify-center gap-1", valueClass)}>
        <Icon className="h-3 w-3 flex-shrink-0" />
        <span className="text-sm font-bold tabular-nums">{value}</span>
      </div>
    </div>
  );
}

// ── Activity stat ────────────────────────────────────────────────────────────
function ActivityStat({
  icon: Icon, value, label,
}: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>
        <span className="font-bold text-foreground">{value}</span>
        <span className="text-muted-foreground ml-1">{label}</span>
      </span>
    </div>
  );
}
