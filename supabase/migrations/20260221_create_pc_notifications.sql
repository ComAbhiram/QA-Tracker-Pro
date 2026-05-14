-- Create pc_notifications table for in-app PC Mode notifications
CREATE TABLE IF NOT EXISTS pc_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pc_name TEXT NOT NULL,
  task_id BIGINT,
  project_name TEXT NOT NULL,
  task_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'assigned')),
  changes JSONB,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_pc_notifications_pc_name ON pc_notifications(pc_name);
CREATE INDEX IF NOT EXISTS idx_pc_notifications_is_read ON pc_notifications(pc_name, is_read);
CREATE INDEX IF NOT EXISTS idx_pc_notifications_created_at ON pc_notifications(created_at DESC);

-- Disable RLS so service role can insert freely
ALTER TABLE pc_notifications DISABLE ROW LEVEL SECURITY;
