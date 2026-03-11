import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface GradientPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function GradientPageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: GradientPageHeaderProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-5 bg-gradient-to-r from-primary/10 to-transparent",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Icon box */}
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 pl-14 sm:pl-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
