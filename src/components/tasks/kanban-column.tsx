"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Task, TaskStatus } from "@/lib/types/tasks";
import { TaskCard } from "./task-card";
import { TaskFormValues } from "./task-form";

// Column header dot + label config
const COLUMN_CONFIG: Record<TaskStatus, { dot: string; label: string; emoji: string }> = {
  todo:        { dot: "bg-slate-400",    label: "To Do",       emoji: "📋" },
  in_progress: { dot: "bg-primary",      label: "In Progress", emoji: "⚡" },
  done:        { dot: "bg-emerald-500",  label: "Done",        emoji: "✅" },
};

interface KanbanColumnProps {
  status:      TaskStatus;
  tasks:       Task[];
  allStatuses: TaskStatus[];
  onMoveTask:  (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onEditTask:  (task: Task) => void;
  onDeleteTask:(taskId: string) => Promise<void>;
  onViewTask:  (task: Task) => void;
  onQuickAdd:  (title: string, status: TaskStatus) => Promise<void>;
}

export function KanbanColumn({
  status,
  tasks,
  allStatuses,
  onMoveTask,
  onEditTask,
  onDeleteTask,
  onViewTask,
  onQuickAdd,
}: KanbanColumnProps) {
  const config       = COLUMN_CONFIG[status];
  const statusIndex  = allStatuses.indexOf(status);
  const canMoveLeft  = statusIndex > 0;
  const canMoveRight = statusIndex < allStatuses.length - 1;

  const [quickTitle, setQuickTitle] = useState("");
  const [addingQuick, setAddingQuick] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setAddingQuick(true);
    try {
      await onQuickAdd(quickTitle.trim(), status);
      setQuickTitle("");
      setShowInput(false);
    } finally {
      setAddingQuick(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-muted/30 min-w-[280px] max-w-[320px] flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", config.dot)} />
          <span className="text-sm font-semibold">{config.emoji} {config.label}</span>
        </div>
        <Badge variant="secondary" className="text-xs h-5 px-1.5">
          {tasks.length}
        </Badge>
      </div>

      {/* Cards list */}
      <ScrollArea className="flex-1 px-3 py-3 max-h-[calc(100vh-280px)]">
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canMoveLeft={canMoveLeft}
              canMoveRight={canMoveRight}
              onMoveLeft={() =>
                onMoveTask(task.id, allStatuses[statusIndex - 1])
              }
              onMoveRight={() =>
                onMoveTask(task.id, allStatuses[statusIndex + 1])
              }
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              onClick={() => onViewTask(task)}
            />
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No tasks yet
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick-add footer */}
      <div className="px-3 pb-3 pt-1 border-t border-border/50">
        {showInput ? (
          <form onSubmit={handleQuickAdd} className="flex items-center gap-1.5">
            <Input
              ref={inputRef}
              placeholder="Task title..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowInput(false);
                  setQuickTitle("");
                }
              }}
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 px-2"
              disabled={addingQuick || !quickTitle.trim()}
            >
              {addingQuick ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-1 rounded-md hover:bg-muted/50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}
