"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { TeamMemberStats, GoalStatus } from "@/lib/types/admin";
import { formatDollar, formatPercent } from "@/lib/utils/metrics";
import { Activity, CheckSquare, Globe, Percent, Zap } from "lucide-react";

// ── Goal status config ──────────────────────────────────────────────────────
const STATUS_CONFIG: Record<GoalStatus, {
  label: string; text: string;
}> = {
  ahead:   { label: "Ahead",    text: "text-emerald-600 dark:text-emerald-400" },
  on_track:{ label: "On track", text: "text-primary" },
  behind:  { label: "Behind",   text: "text-orange-600 dark:text-orange-400" },
  no_goal: { label: "No goal",  text: "text-muted-foreground" },
};

// ── Progress text colour by completion % ────────────────────────────────────
function progressTextColor(pct: number): string {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
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

  const profitPct = member.target_profit && member.target_profit > 0
    ? Math.min(100, Math.round(((member.actual_profit ?? 0) / member.target_profit) * 100))
    : null;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-lg hover:border-primary/30 hover:shadow-primary/5 transition-all duration-200">

      {/* ── Status accent bar (3px) — always CampLog blue ───────────── */}
      <div className="h-1 w-full flex-shrink-0 bg-primary" />

      {/* ── Header: avatar + identity ─────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3.5 border-b border-border/50">
        {/* Avatar — real image or fallback initials with status dot */}
        <div className="relative flex-shrink-0">
          {member.avatar_url ? (
            <div className="h-14 w-14 rounded-full overflow-hidden ring-2 ring-border">
              <Image
                src={member.avatar_url}
                alt={displayName}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center text-white text-base font-bold ring-2 ring-border/40",
              avatarColor(member.email)
            )}>
              {initials(member)}
            </div>
          )}
          {/* Status dot — bottom-right corner, always CampLog blue */}
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-2 ring-card bg-primary" />
        </div>

        {/* Name + email + status inline label */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
          <p className={cn("text-[10px] font-semibold uppercase tracking-wider mt-1", status.text)}>
            {status.label}
          </p>
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">

        {/* ── Revenue + Profit side-by-side ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue */}
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Revenue
            </span>
            <p className="text-lg font-bold tabular-nums mt-0.5 leading-tight">
              {member.actual_revenue != null
                ? formatDollar(member.actual_revenue)
                : <span className="text-muted-foreground text-sm font-normal">No data</span>
              }
            </p>
            {member.target_revenue && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                of {formatDollar(member.target_revenue)}
              </p>
            )}
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              {revenuePct !== null ? (
                <div
                  className="h-full rounded-full transition-all duration-500 bg-primary"
                  style={{ width: `${revenuePct}%` }}
                />
              ) : (
                <div className="h-full rounded-full bg-muted-foreground/15 w-full" />
              )}
            </div>
            {revenuePct !== null && (
              <p className={cn("text-[10px] font-semibold mt-1 text-right", progressTextColor(revenuePct))}>
                {revenuePct}%
              </p>
            )}
          </div>

          {/* Profit */}
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Profit
            </span>
            <p className={cn(
              "text-lg font-bold tabular-nums mt-0.5 leading-tight",
              member.actual_profit != null && member.actual_profit < 0
                ? "text-red-600 dark:text-red-400"
                : member.actual_profit != null && member.actual_profit > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : ""
            )}>
              {member.actual_profit != null
                ? formatDollar(member.actual_profit)
                : <span className="text-muted-foreground text-sm font-normal">No data</span>
              }
            </p>
            {member.target_profit && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                of {formatDollar(member.target_profit)}
              </p>
            )}
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              {profitPct !== null ? (
                <div
                  className="h-full rounded-full transition-all duration-500 bg-primary"
                  style={{ width: `${Math.max(0, profitPct)}%` }}
                />
              ) : (
                <div className="h-full rounded-full bg-muted-foreground/15 w-full" />
              )}
            </div>
            {profitPct !== null && (
              <p className={cn("text-[10px] font-semibold mt-1 text-right", progressTextColor(profitPct))}>
                {profitPct}%
              </p>
            )}
          </div>
        </div>

        {/* ── Margin + FB Spend chips ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            label="Margin"
            value={member.actual_margin_pct != null ? formatPercent(member.actual_margin_pct) : "—"}
            icon={Percent}
            iconClass="text-primary"
            iconBg="bg-primary/10"
          />
          <MetricTile
            label="FB Spend"
            value={member.actual_fb_spend != null ? formatDollar(member.actual_fb_spend) : "—"}
            icon={Zap}
            iconClass="text-orange-500"
            iconBg="bg-orange-500/10"
          />
        </div>

        {/* ── Sites section ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Sites{member.site_count > 0 ? ` · ${member.site_count}` : ""}
            </span>
          </div>
          {member.sites.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {member.sites.slice(0, 5).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-md bg-muted/60 border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {s}
                </span>
              ))}
              {member.sites.length > 5 && (
                <span className="inline-flex items-center rounded-md bg-muted/40 border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  +{member.sites.length - 5} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No sites added</p>
          )}
        </div>

        {/* ── Activity footer ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5">
            <Activity className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground leading-none">{member.changes_this_month}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">changes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5">
            <CheckSquare className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground leading-none">{member.open_tasks}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">open tasks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Metric tile ─────────────────────────────────────────────────────────────
function MetricTile({
  label, value, icon: Icon, iconClass, iconBg,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconClass: string;
  iconBg: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/50 px-3 py-2.5 flex items-center gap-2.5">
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon className={cn("h-3.5 w-3.5", iconClass)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-sm font-bold tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}
