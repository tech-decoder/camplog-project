"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  List,
  Target,
  BarChart3,
  Megaphone,
  Sparkles,
  HelpCircle,
  Globe,
  Settings,
  SquareKanban,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useProfile } from "@/components/providers/profile-provider";

const navItems = [
  { label: "Dashboard", href: "/dashboard",  icon: LayoutDashboard },
  { label: "Chat",      href: "/chat",        icon: MessageSquare },
  { label: "Generate",  href: "/generate",    icon: Sparkles },
  { label: "Changes",   href: "/changes",     icon: List },
  { label: "Tasks",     href: "/tasks",       icon: SquareKanban },
  { label: "Campaigns", href: "/campaigns",   icon: Megaphone },
  { label: "Goals",     href: "/goals",       icon: Target },
  { label: "Reports",   href: "/reports",     icon: BarChart3 },
  { label: "My Sites",  href: "/my-sites",    icon: Globe },
  { label: "Settings",  href: "/settings",    icon: Settings },
];

export function Sidebar() {
  const pathname    = usePathname();
  const { profile } = useProfile();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar border-r border-sidebar-border">
      {/* Logo Header — h-16 to match topbar */}
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-sidebar-border">
        <Image
          src="/camplog.svg"
          alt="CampLog"
          width={28}
          height={28}
          className="rounded-lg"
        />
        <span className="text-lg font-semibold text-sidebar-foreground">CampLog</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        {/* Admin-only: Team link */}
        {profile?.is_admin && (
          <>
            <div className="pt-2 pb-1 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Admin
              </p>
            </div>
            <Link
              href="/admin/team"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith("/admin/team")
                  ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              <Users className="h-5 w-5" />
              Team
            </Link>
          </>
        )}
      </nav>

      {/* Footer — Theme toggle + Help */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <a
          href="mailto:bill@ltv.so"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-5 w-5" />
          Help
        </a>
      </div>
    </aside>
  );
}
