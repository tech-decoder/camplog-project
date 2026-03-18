"use client";

import { useEffect, useState } from "react";
import { SquareKanban, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskForm, TaskFormValues } from "@/components/tasks/task-form";
import { Task } from "@/lib/types/tasks";

export default function TasksPage() {
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [pendingTask, setPendingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTasks(data); })
      .catch(() => toast.error("Failed to load tasks"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(values: TaskFormValues) {
    const res = await fetch("/api/tasks", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        description:   values.description   || null,
        site:          values.site          || null,
        campaign_name: values.campaign_name || null,
        due_date:      values.due_date      || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to create task");
    }
    const created: Task = await res.json();
    setPendingTask(created);   // signals KanbanBoard to prepend instantly
    setCreateOpen(false);
    toast.success("Task created");
  }

  return (
    <PageShell>
      <GradientPageHeader
        icon={SquareKanban}
        title="Tasks"
        description="Track campaign actions, creative to-dos, and goals."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">New Task</span>
                <span className="sm:hidden">New</span>
              </Button>
            </DialogTrigger>
            {/* Full-width on mobile, capped on sm+ */}
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-xl p-5">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <TaskForm
                onSubmit={handleCreate}
                onCancel={() => setCreateOpen(false)}
                submitLabel="Create task"
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mt-4 sm:mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading tasks...</span>
          </div>
        ) : (
          <KanbanBoard initialTasks={tasks} pendingTask={pendingTask} />
        )}
      </div>
    </PageShell>
  );
}
