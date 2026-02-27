"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Compact toggle for the sidebar — pill-shaped slider with Sun/Moon icons.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-[52px] h-7" />;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-7 w-[52px] items-center rounded-full border border-sidebar-border bg-sidebar-accent transition-colors cursor-pointer flex-shrink-0"
    >
      {/* Track icons */}
      <Sun className="absolute left-1.5 h-3.5 w-3.5 text-sidebar-foreground/40" />
      <Moon className="absolute right-1.5 h-3.5 w-3.5 text-sidebar-foreground/40" />
      {/* Knob */}
      <span
        className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-sidebar-primary shadow-sm transition-transform duration-200 flex items-center justify-center ${
          isDark ? "translate-x-[26px]" : "translate-x-[2px]"
        }`}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-sidebar-primary-foreground" />
        ) : (
          <Sun className="h-3 w-3 text-sidebar-primary-foreground" />
        )}
      </span>
    </button>
  );
}

/**
 * Larger toggle for the Settings page — with "Light" and "Dark" labels.
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-3">
      <span
        className={`text-sm font-medium transition-colors ${
          !isDark ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Light
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`relative inline-flex h-8 w-[60px] items-center rounded-full border transition-colors cursor-pointer ${
          isDark
            ? "bg-primary border-primary"
            : "bg-muted border-border"
        }`}
      >
        {/* Track icons */}
        <Sun className={`absolute left-1.5 h-3.5 w-3.5 transition-colors ${isDark ? "text-primary-foreground/40" : "text-muted-foreground/60"}`} />
        <Moon className={`absolute right-1.5 h-3.5 w-3.5 transition-colors ${isDark ? "text-primary-foreground/40" : "text-muted-foreground/60"}`} />
        {/* Knob */}
        <span
          className={`absolute top-[3px] h-[26px] w-[26px] rounded-full shadow-sm transition-transform duration-200 flex items-center justify-center ${
            isDark
              ? "translate-x-[30px] bg-primary-foreground"
              : "translate-x-[2px] bg-background"
          }`}
        >
          {isDark ? (
            <Moon className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-foreground" />
          )}
        </span>
      </button>

      <span
        className={`text-sm font-medium transition-colors ${
          isDark ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Dark
      </span>
    </div>
  );
}
