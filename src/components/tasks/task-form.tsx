"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_CATEGORY_LABELS,
} from "@/lib/types/tasks";

export interface TaskFormValues {
  title:         string;
  description:   string;
  status:        TaskStatus;
  priority:      TaskPriority;
  category:      TaskCategory;
  site:          string;
  campaign_name: string;
  due_date:      string;
}

interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>;
  defaultStatus?: TaskStatus;
  onSubmit:  (values: TaskFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const DEFAULTS: TaskFormValues = {
  title:         "",
  description:   "",
  status:        "todo",
  priority:      "medium",
  category:      "campaign_action",
  site:          "",
  campaign_name: "",
  due_date:      "",
};

export function TaskForm({
  initialValues,
  defaultStatus,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>({
    ...DEFAULTS,
    ...(defaultStatus ? { status: defaultStatus } : {}),
    ...initialValues,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) return;
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Title <span className="text-destructive">*</span></Label>
        <Input
          id="task-title"
          placeholder="e.g. Test MBM in CA geo"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="task-desc">Description</Label>
        <Textarea
          id="task-desc"
          placeholder="Optional notes or context..."
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Status + Priority row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={values.status} onValueChange={(v) => set("status", v as TaskStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={values.priority} onValueChange={(v) => set("priority", v as TaskPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={values.category} onValueChange={(v) => set("category", v as TaskCategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map((c) => (
              <SelectItem key={c} value={c}>
                {TASK_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Site + Campaign row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-site">Site</Label>
          <Input
            id="task-site"
            placeholder="e.g. MBM, GXP"
            value={values.site}
            onChange={(e) => set("site", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-campaign">Campaign</Label>
          <Input
            id="task-campaign"
            placeholder="Campaign name"
            value={values.campaign_name}
            onChange={(e) => set("campaign_name", e.target.value)}
          />
        </div>
      </div>

      {/* Due date */}
      <div className="space-y-1.5">
        <Label htmlFor="task-due">Due Date</Label>
        <Input
          id="task-due"
          type="date"
          value={values.due_date}
          onChange={(e) => set("due_date", e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving || !values.title.trim()}>
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Convert a Task to TaskFormValues (for editing) */
export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title:         task.title,
    description:   task.description ?? "",
    status:        task.status,
    priority:      task.priority,
    category:      (task.category ?? "campaign_action") as TaskCategory,
    site:          task.site ?? "",
    campaign_name: task.campaign_name ?? "",
    due_date:      task.due_date ?? "",
  };
}
