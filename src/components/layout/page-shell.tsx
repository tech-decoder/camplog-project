import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("max-w-6xl mx-auto space-y-6", className)}>
      {children}
    </div>
  );
}
