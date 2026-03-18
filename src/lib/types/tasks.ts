export type TaskStatus   = "todo" | "in_progress" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskCategory = "campaign_action" | "creative" | "goal" | "research" | "admin";

export interface Task {
  id:            string;
  user_id:       string;
  title:         string;
  description:   string | null;
  status:        TaskStatus;
  priority:      TaskPriority;
  category:      TaskCategory | null;
  site:          string | null;
  campaign_name: string | null;
  due_date:      string | null; // ISO date YYYY-MM-DD
  sort_order:    number;
  created_at:    string;
  updated_at:    string;
}

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  campaign_action: "Campaign Action",
  creative:        "Creative",
  goal:            "Goal",
  research:        "Research",
  admin:           "Admin",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high:   "High",
  medium: "Medium",
  low:    "Low",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        "To Do",
  in_progress: "In Progress",
  done:        "Done",
};
