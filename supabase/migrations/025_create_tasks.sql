-- Create tasks table for the Kanban board feature
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo', 'in_progress', 'done')),
  priority      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  category      TEXT DEFAULT 'campaign_action'
                  CHECK (category IN ('campaign_action', 'creative', 'goal', 'research', 'admin')),
  site          TEXT,           -- site abbreviation (MBM, GXP, NASI, etc.)
  campaign_name TEXT,           -- optional free-text campaign reference
  due_date      DATE,
  sort_order    INTEGER NOT NULL DEFAULT 0,  -- reserved for future drag-and-drop ordering

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user_id        ON tasks(user_id);
CREATE INDEX idx_tasks_user_id_status ON tasks(user_id, status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
