"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, Calendar, Target, Palette, Trophy, Search, FileText } from "lucide-react";
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
import { parseISO, isAfter, startOfToday } from "date-fns";

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  urgent: "bg-red-500/12 text-red-600 border-red-200 dark:border-red-900 dark:text-red-400",
  high:   "bg-orange-500/12 text-orange-600 border-orange-200 dark:border-orange-900 dark:text-orange-400",
  medium: "bg-primary/10 text-primary border-primary/25",
  low:    "bg-muted text-muted-foreground border-border",
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

  if (!task) return null;

  const category    = task.category ?? "campaign_action";
  const CategoryIcon = CATEGORY_ICON[category as TaskCategory] ?? Target;
  const isOverdue   = task.due_date
    ? isAfter(startOfToday(), parseISO(task.due_date))
    : false;

  async function handleUpdate(values: TaskFormValues) {
    await onUpdate(task!.id, values);
    setEditing(false);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); setEditing(false); } }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-base font-semibold leading-snug pr-2">
              {task.title}
            </SheetTitle>
            {!editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="flex-shrink-0"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        {editing ? (
          <TaskForm
            initialValues={taskToFormValues(task)}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            submitLabel="Save changes"
          />
        ) : (
          <div className="space-y-4">
            {/* Status + Priority */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                {TASK_STATUS_LABELS[task.status]}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-xs", PRIORITY_BADGE[task.priority])}
              >
                {TASK_PRIORITY_LABELS[task.priority]} priority
              </Badge>
            </div>

            <Separator />

            {/* Meta fields */}
            <dl className="space-y-3 text-sm">
              <Row label="Category">
                <div className="flex items-center gap-1.5">
                  <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {TASK_CATEGORY_LABELS[category as TaskCategory]}
                </div>
              </Row>

              {task.site && (
                <Row label="Site">
                  <Badge variant="secondary" className="text-xs font-semibold uppercase">
                    {task.site}
                  </Badge>
                </Row>
              )}

              {task.campaign_name && (
                <Row label="Campaign">{task.campaign_name}</Row>
              )}

              {task.due_date && (
                <Row label="Due date">
                  <div className={cn(
                    "flex items-center gap-1.5",
                    isOverdue && task.status !== "done"
                      ? "text-red-600 dark:text-red-400 font-semibold"
                      : ""
                  )}>
                    <Calendar className="h-3.5 w-3.5" />
                    {isOverdue && task.status !== "done" ? "Overdue · " : ""}
                    {task.due_date}
                  </div>
                </Row>
              )}
            </dl>

            {/* Description */}
            {task.description && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                </div>
              </>
            )}

            {/* Timestamps */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Created {new Date(task.created_at).toLocaleDateString()}</p>
              {task.updated_at !== task.created_at && (
                <p>Updated {new Date(task.updated_at).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="text-muted-foreground w-24 flex-shrink-0">{label}</dt>
      <dd className="flex-1">{children}</dd>
    </div>
  );
}
