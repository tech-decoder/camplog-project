"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Task, TaskStatus, TASK_STATUS_LABELS } from "@/lib/types/tasks";
import { KanbanColumn } from "./kanban-column";
import { TaskForm, TaskFormValues, taskToFormValues } from "./task-form";
import { TaskDetailSheet } from "./task-detail-sheet";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

const STATUS_EMOJI: Record<TaskStatus, string> = {
  todo:        "📋",
  in_progress: "⚡",
  done:        "✅",
};

interface KanbanBoardProps {
  initialTasks: Task[];
}

export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
  const [tasks,        setTasks]        = useState<Task[]>(initialTasks);
  const [editingTask,  setEditingTask]  = useState<Task | null>(null);
  const [viewingTask,  setViewingTask]  = useState<Task | null>(null);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [activeTab,    setActiveTab]    = useState<TaskStatus>("todo");

  // ── Quick-add ─────────────────────────────────────────────────────────────
  async function handleQuickAdd(title: string, status: TaskStatus) {
    try {
      const res = await fetch("/api/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const created: Task = await res.json();
      setTasks((prev) => [created, ...prev]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = useCallback(async (id: string, values: TaskFormValues) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...values,
              description:   values.description   || null,
              site:          values.site          || null,
              campaign_name: values.campaign_name || null,
              due_date:      values.due_date      || null,
            }
          : t
      )
    );
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          description:   values.description   || null,
          site:          values.site          || null,
          campaign_name: values.campaign_name || null,
          due_date:      values.due_date      || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (viewingTask?.id === id) setViewingTask(updated);
      setEditingTask(null);
      toast.success("Task updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
      throw err;
    }
  }, [viewingTask]);

  // ── Move ──────────────────────────────────────────────────────────────────
  async function handleMove(taskId: string, newStatus: TaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      // Follow the card to its new column on mobile
      setActiveTab(newStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move task");
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Task deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  // ── View ──────────────────────────────────────────────────────────────────
  function handleView(task: Task) {
    setViewingTask(task);
    setSheetOpen(true);
  }

  const tasksByStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s);

  // Shared column props factory
  const colProps = (status: TaskStatus) => ({
    status,
    tasks:        tasksByStatus(status),
    allStatuses:  STATUSES,
    onMoveTask:   handleMove,
    onEditTask:   (t: Task) => setEditingTask(t),
    onDeleteTask: handleDelete,
    onViewTask:   handleView,
    onQuickAdd:   handleQuickAdd,
  });

  return (
    <>
      {/* ── Mobile: tab switcher (hidden md+) ─────────────────────────── */}
      <div className="md:hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TaskStatus)}
        >
          <TabsList className="w-full grid grid-cols-3 h-10 mb-4">
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs gap-1 px-1">
                <span>{STATUS_EMOJI[s]}</span>
                <span className="truncate">{TASK_STATUS_LABELS[s]}</span>
                <span className="ml-0.5 rounded-full bg-muted-foreground/20 px-1 text-[10px] font-semibold">
                  {tasksByStatus(s).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUSES.map((s) => (
            <TabsContent key={s} value={s}>
              <KanbanColumn {...colProps(s)} isMobile />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── Desktop: 3-column layout (hidden <md) ─────────────────────── */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4 items-start">
        {STATUSES.map((s) => (
          <KanbanColumn key={s} {...colProps(s)} />
        ))}
      </div>

      {/* ── Edit dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={!!editingTask}
        onOpenChange={(o) => { if (!o) setEditingTask(null); }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              initialValues={taskToFormValues(editingTask)}
              onSubmit={(v) => handleUpdate(editingTask.id, v)}
              onCancel={() => setEditingTask(null)}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Detail sheet ──────────────────────────────────────────────── */}
      <TaskDetailSheet
        task={viewingTask}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setViewingTask(null); }}
        onUpdate={handleUpdate}
      />
    </>
  );
}

export type { KanbanBoardProps };
