"use client";

import { usePathname } from "next/navigation";
import { useProfile } from "@/components/providers/profile-provider";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/chat": "Chat",
  "/changes": "Changes",
  "/goals": "Goals",
  "/reports": "Reports",
  "/settings": "Settings",
  "/my-sites": "My Sites",
};

export function Header() {
  const pathname = usePathname();
  const { profile } = useProfile();

  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/changes/") ? "Change Detail" : "CampLog");

  // Dynamic initials from nickname or full_name
  const initials = profile
    ? (
        profile.nickname ||
        profile.full_name ||
        profile.email ||
        "?"
      )
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "..";

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
