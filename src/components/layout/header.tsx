"use client";

import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/components/providers/profile-provider";
import { cn } from "@/lib/utils";
import { Search, LogOut, Settings, Globe } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/chat": "Chat",
  "/generate": "Generate",
  "/changes": "Changes",
  "/campaigns": "Campaigns",
  "/goals": "Goals",
  "/reports": "Reports",
  "/settings": "Settings",
  "/my-sites": "My Sites",
};

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: "CampLog" }];

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length >= 1) {
    const basePath = `/${segments[0]}`;
    const pageName = PAGE_NAMES[basePath];
    if (pageName) {
      crumbs.push({
        label: pageName,
        href: segments.length > 1 ? basePath : undefined,
      });
    }
  }

  if (segments.length >= 2) {
    crumbs.push({ label: "Detail" });
  }

  return crumbs;
}

interface HeaderProps {
  onOpenCommandPalette?: () => void;
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useProfile();

  const breadcrumbs = getBreadcrumbs(pathname);

  const initials = profile
    ? (profile.nickname || profile.full_name || profile.email || "?")
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "..";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 h-16 bg-card/90 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
        {/* Left: Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0 truncate">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-muted-foreground/40">/</span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    i === breadcrumbs.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Right: Search trigger + Account */}
        <div className="flex items-center gap-3">
          {/* Search Trigger — desktop: fixed-width bar, mobile: icon-only */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 h-9 w-[280px] rounded-md border border-border bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </button>
          <button
            onClick={onOpenCommandPalette}
            className="sm:hidden flex items-center justify-center h-9 w-9 rounded-md border border-border bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
                <Avatar>
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt="Avatar" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {profile && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">
                      {profile.nickname || profile.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/my-sites" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  My Sites
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
