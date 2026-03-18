"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { Users, ChevronLeft, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";
import { Button } from "@/components/ui/button";
import { MemberCard } from "@/components/admin/member-card";
import { TeamOverview } from "@/lib/types/admin";
import { useProfile } from "@/components/providers/profile-provider";
import { formatDollar, formatPercent } from "@/lib/utils/metrics";

export default function TeamPage() {
  const router          = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const [currentMonth,  setCurrentMonth]  = useState(() => format(startOfMonth(new Date()), "yyyy-MM"));
  const [overview,      setOverview]      = useState<TeamOverview | null>(null);
  const [loading,       setLoading]       = useState(true);

  // Guard: redirect non-admins
  useEffect(() => {
    if (!profileLoading && profile && !profile.is_admin) {
      router.replace("/dashboard");
    }
  }, [profile, profileLoading, router]);

  // Fetch team data when month changes
  useEffect(() => {
    if (!profile?.is_admin) return;
    setLoading(true);
    fetch(`/api/admin/team?month=${currentMonth}`)
      .then((r) => r.json())
      .then((data: TeamOverview) => setOverview(data))
      .catch(() => toast.error("Failed to load team data"))
      .finally(() => setLoading(false));
  }, [currentMonth, profile?.is_admin]);

  function prevMonth() {
    setCurrentMonth((m) => format(subMonths(parseISO(`${m}-01`), 1), "yyyy-MM"));
  }
  function nextMonth() {
    const next = addMonths(parseISO(`${currentMonth}-01`), 1);
    if (next <= startOfMonth(new Date())) {
      setCurrentMonth(format(next, "yyyy-MM"));
    }
  }
  const isCurrentMonth = currentMonth === format(startOfMonth(new Date()), "yyyy-MM");
  const monthLabel = format(parseISO(`${currentMonth}-01`), "MMMM yyyy");

  if (profileLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!profile?.is_admin) return null;

  const totalMargin = overview && overview.total_revenue > 0
    ? (overview.total_profit / overview.total_revenue) * 100
    : null;

  return (
    <PageShell>
      <GradientPageHeader
        icon={Users}
        title="Team Overview"
        description={overview
          ? `${overview.members.length} members · ${overview.total_sites} sites · ${monthLabel}`
          : `Campaign performance for all members · ${monthLabel}`
        }
        actions={
          /* Month navigator */
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-[120px] text-center">
              {monthLabel}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={nextMonth}
              disabled={isCurrentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* ── Summary strip ───────────────────────────────────────────────── */}
      {overview && !loading && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile
            label="Total Sites"
            value={String(overview.total_sites)}
            sub={`${overview.members.length} members`}
          />
          <SummaryTile
            label="Total Revenue"
            value={formatDollar(overview.total_revenue)}
            sub={monthLabel}
            highlight
          />
          <SummaryTile
            label="Total Profit"
            value={formatDollar(overview.total_profit)}
            sub={totalMargin !== null ? `${formatPercent(totalMargin)} margin` : undefined}
            positive={overview.total_profit >= 0}
          />
          <SummaryTile
            label="Total FB Spend"
            value={formatDollar(overview.total_fb_spend)}
            sub="ad spend"
          />
        </div>
      )}

      {/* ── Member grid ─────────────────────────────────────────────────── */}
      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading team data...</span>
          </div>
        ) : overview?.members.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No users found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview?.members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ── Summary tile ──────────────────────────────────────────────────────────
function SummaryTile({
  label,
  value,
  sub,
  highlight,
  positive,
}: {
  label:      string;
  value:      string;
  sub?:       string;
  highlight?: boolean;
  positive?:  boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-border px-4 py-3",
      highlight ? "bg-primary/5 border-primary/20" : "bg-card"
    )}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn(
        "text-xl font-bold",
        positive === true  ? "text-emerald-600 dark:text-emerald-400" :
        positive === false ? "text-red-600 dark:text-red-400" :
        highlight          ? "text-primary" : ""
      )}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
