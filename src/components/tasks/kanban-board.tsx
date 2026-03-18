"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Task, TaskStatus } from "@/lib/types/tasks";
import { KanbanColumn } from "./kanban-column";
import { TaskForm, TaskFormValues, taskToFormValues } from "./task-form";
import { TaskDetailSheet } from "./task-detail-sheet";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

interface KanbanBoardProps {
  initialTasks: Task[];
}

export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
  const [tasks,       setTasks]       = useState<Task[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [sheetOpen,   setSheetOpen]   = useState(false);

  // ── Quick-add / Create ──────────────────────────────────────────────────
  async function handleQuickAdd(title: string, status: TaskStatus) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
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

  // ── Full form create (called from dialog) ───────────────────────────────
  async function handleCreate(values: TaskFormValues) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
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
      const created: Task = await res.json();
      setTasks((prev) => [created, ...prev]);
      toast.success("Task created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
      throw err;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────
  const handleUpdate = useCallback(async (id: string, values: TaskFormValues) => {
    // Optimistic
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
        method: "PATCH",
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
      // keep sheet/dialog in sync
      if (viewingTask?.id === id) setViewingTask(updated);
      setEditingTask(null);
      toast.success("Task updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
      throw err;
    }
  }, [viewingTask]);

  // ── Move (status change) ────────────────────────────────────────────────
  async function handleMove(taskId: string, newStatus: TaskStatus) {
    // Optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t } : t))
      );
      toast.error(err instanceof Error ? err.message : "Failed to move task");
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
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

  // ── View (sheet) ────────────────────────────────────────────────────────
  function handleView(task: Task) {
    setViewingTask(task);
    setSheetOpen(true);
  }

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  return (
    <>
      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus(status)}
            allStatuses={STATUSES}
            onMoveTask={handleMove}
            onEditTask={(task) => setEditingTask(task)}
            onDeleteTask={handleDelete}
            onViewTask={handleView}
            onQuickAdd={handleQuickAdd}
          />
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog
        open={!!editingTask}
        onOpenChange={(o) => { if (!o) setEditingTask(null); }}
      >
        <DialogContent className="sm:max-w-md">
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

      {/* Detail sheet */}
      <TaskDetailSheet
        task={viewingTask}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setViewingTask(null); }}
        onUpdate={handleUpdate}
      />
    </>
  );
}

// Export handleCreate so the page can pass it to the header button
export type { KanbanBoardProps };
