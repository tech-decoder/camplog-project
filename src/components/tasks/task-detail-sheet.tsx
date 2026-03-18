"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Pencil,
  Calendar,
  Target,
  Palette,
  Trophy,
  Search,
  FileText,
  ArrowLeft,
  Tag,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Task,
  TaskCategory,
  TaskPriority,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/types/tasks";
import { TaskForm, TaskFormValues, taskToFormValues } from "./task-form";
import { parseISO, isAfter, startOfToday, format } from "date-fns";

// ── Priority colours ────────────────────────────────────────────────────────
const PRIORITY_BAR: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high:   "bg-orange-500",
  medium: "bg-primary",
  low:    "bg-slate-300 dark:bg-slate-600",
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  urgent: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/60 dark:text-red-400",
  high:   "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/60 dark:text-orange-400",
  medium: "bg-primary/10 text-primary border-primary/25",
  low:    "bg-muted text-muted-foreground border-border",
};

const STATUS_BADGE: Record<string, string> = {
  todo:        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  in_progress: "bg-primary/10 text-primary border-primary/25",
  done:        "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900/60",
};

const CATEGORY_ICON: Record<TaskCategory, React.ElementType> = {
  campaign_action: Target,
  creative:        Palette,
  goal:            Trophy,
  research:        Search,
  admin:           FileText,
};

interface TaskDetailSheetProps {
  task:     Task | null;
  open:     boolean;
  onClose:  () => void;
  onUpdate: (id: string, values: TaskFormValues) => Promise<void>;
}

export function TaskDetailSheet({ task, open, onClose, onUpdate }: TaskDetailSheetProps) {
  const [editing, setEditing] = useState(false);

  async function handleUpdate(values: TaskFormValues) {
    await onUpdate(task!.id, values);
    setEditing(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => { if (!o) { onClose(); setEditing(false); } }}
    >
      <SheetContent
        showCloseButton={false}
        className="w-full sm:max-w-[420px] p-0 flex flex-col gap-0"
      >
        <VisuallyHidden>
          <SheetTitle>{task?.title ?? "Task detail"}</SheetTitle>
        </VisuallyHidden>
        {task && (
          <>
            {/* ── Sticky header ─────────────────────────────────────────── */}
            <div className="flex-shrink-0">
              {/* Priority bar */}
              <div className={cn("h-1 w-full", PRIORITY_BAR[task.priority])} />

              <div className="px-5 pt-4 pb-4 border-b border-border">
                {/* Top row: back/close + edit */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => { onClose(); setEditing(false); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Close
                  </button>

                  {!editing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(true)}
                      className="h-7 text-xs px-2.5"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  {editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-base font-semibold leading-snug">{task.title}</h2>

                {/* Status + Priority badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <Badge
                    variant="outline"
                    className={cn("text-xs h-5 px-2", STATUS_BADGE[task.status] ?? "")}
                  >
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-xs h-5 px-2", PRIORITY_BADGE[task.priority])}
                  >
                    {TASK_PRIORITY_LABELS[task.priority]}
                  </Badge>
                </div>
              </div>
            </div>

            {/* ── Scrollable body ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {editing ? (
                <TaskForm
                  initialValues={taskToFormValues(task)}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditing(false)}
                  submitLabel="Save changes"
                />
              ) : (
                <div className="space-y-5">
                  {/* Meta grid */}
                  <div className="space-y-3">
                    <MetaRow
                      icon={Target}
                      label="Category"
                      value={TASK_CATEGORY_LABELS[task.category as TaskCategory ?? "campaign_action"]}
                    />

                    {task.site && (
                      <MetaRow icon={Tag} label="Site">
                        <Badge
                          variant="secondary"
                          className="text-xs font-semibold uppercase h-5 px-2"
                        >
                          {task.site}
                        </Badge>
                      </MetaRow>
                    )}

                    {task.campaign_name && (
                      <MetaRow
                        icon={Megaphone}
                        label="Campaign"
                        value={task.campaign_name}
                      />
                    )}

                    {task.due_date && (
                      <DueDateRow task={task} />
                    )}
                  </div>

                  {/* Description */}
                  {task.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Notes
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                          {task.description}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Footer timestamps */}
                  <Separator />
                  <div className="text-[11px] text-muted-foreground space-y-0.5 pb-2">
                    <p>Created {format(new Date(task.created_at), "MMM d, yyyy · h:mm a")}</p>
                    {task.updated_at !== task.created_at && (
                      <p>Updated {format(new Date(task.updated_at), "MMM d, yyyy · h:mm a")}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MetaRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
          {label}
        </p>
        {children ?? (
          <p className="text-sm font-medium leading-tight">{value}</p>
        )}
      </div>
    </div>
  );
}

function DueDateRow({ task }: { task: Task }) {
  const isOverdue = task.due_date
    ? isAfter(startOfToday(), parseISO(task.due_date))
    : false;
  const isDone = task.status === "done";
  const overdue = isOverdue && !isDone;

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
        overdue ? "bg-red-500/10" : "bg-muted"
      )}>
        <Calendar className={cn(
          "h-3.5 w-3.5",
          overdue ? "text-red-500" : "text-muted-foreground"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
          Due date
        </p>
        <p className={cn(
          "text-sm font-medium leading-tight",
          overdue ? "text-red-600 dark:text-red-400" : ""
        )}>
          {overdue && "Overdue · "}
          {task.due_date
            ? format(parseISO(task.due_date), "MMM d, yyyy")
            : task.due_date}
        </p>
      </div>
    </div>
  );
}
