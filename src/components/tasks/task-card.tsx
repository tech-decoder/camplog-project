"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Target,
  Palette,
  Trophy,
  Search,
  FileText,
  Calendar,
} from "lucide-react";
import { Task, TaskCategory, TaskPriority, TASK_CATEGORY_LABELS } from "@/lib/types/tasks";
import { isAfter, parseISO, startOfToday } from "date-fns";

// ── Priority bar colours ────────────────────────────────────────────────────
const PRIORITY_BAR: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high:   "bg-orange-500",
  medium: "bg-primary",
  low:    "bg-slate-300 dark:bg-slate-600",
};

// ── Priority badge colours ──────────────────────────────────────────────────
const PRIORITY_BADGE: Record<TaskPriority, string> = {
  urgent: "bg-red-500/12 text-red-600 border-red-200 dark:border-red-900 dark:text-red-400",
  high:   "bg-orange-500/12 text-orange-600 border-orange-200 dark:border-orange-900 dark:text-orange-400",
  medium: "bg-primary/10 text-primary border-primary/25",
  low:    "bg-muted text-muted-foreground border-border",
};

// ── Category icons ──────────────────────────────────────────────────────────
const CATEGORY_ICON: Record<TaskCategory, React.ElementType> = {
  campaign_action: Target,
  creative:        Palette,
  goal:            Trophy,
  research:        Search,
  admin:           FileText,
};

interface TaskCardProps {
  task:           Task;
  canMoveLeft:    boolean;
  canMoveRight:   boolean;
  onMoveLeft:     () => void;
  onMoveRight:    () => void;
  onEdit:         () => void;
  onDelete:       () => void;
  onClick:        () => void;
}

export function TaskCard({
  task,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onEdit,
  onDelete,
  onClick,
}: TaskCardProps) {
  const category   = task.category ?? "campaign_action";
  const CategoryIcon = CATEGORY_ICON[category as TaskCategory] ?? Target;

  const isOverdue = task.due_date
    ? isAfter(startOfToday(), parseISO(task.due_date))
    : false;

  const isDone = task.status === "done";

  return (
    <div
      className={cn(
        "group relative flex rounded-lg border border-border bg-card shadow-sm overflow-hidden",
        "hover:shadow-md hover:border-primary/30 transition-all duration-150",
        isDone && "opacity-60"
      )}
    >
      {/* Left priority bar */}
      <div className={cn("w-1 flex-shrink-0", PRIORITY_BAR[task.priority])} />

      {/* Card content */}
      <div className="flex-1 min-w-0 p-3">
        {/* Clickable body */}
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left"
        >
          <p className={cn(
            "text-sm font-medium leading-snug line-clamp-2",
            isDone && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Category */}
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 gap-1 border-border"
            >
              <CategoryIcon className="h-2.5 w-2.5" />
              {TASK_CATEGORY_LABELS[category as TaskCategory]}
            </Badge>

            {/* Site */}
            {task.site && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 font-semibold uppercase"
              >
                {task.site}
              </Badge>
            )}

            {/* Priority */}
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-4", PRIORITY_BADGE[task.priority])}
            >
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
          </div>

          {/* Due date */}
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-1 mt-1.5 text-[11px]",
              isOverdue && !isDone
                ? "text-red-600 dark:text-red-400 font-semibold"
                : "text-muted-foreground"
            )}>
              <Calendar className="h-3 w-3" />
              {isOverdue && !isDone ? "Overdue · " : ""}
              {formatDueDate(task.due_date)}
            </div>
          )}
        </button>

        {/* Action row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          {/* Move buttons */}
          <div className="flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              disabled={!canMoveLeft}
              onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
              title="Move left"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              disabled={!canMoveRight}
              onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
              title="Move right"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* ··· menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function formatDueDate(iso: string): string {
  try {
    const d = parseISO(iso);
    const today = startOfToday();
    const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    // e.g. "Mar 21"
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
