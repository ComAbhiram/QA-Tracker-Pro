-- Add new fields to tasks table
-- Run this in Supabase SQL Editor

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS project_type TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS comments TEXT,
ADD COLUMN IF NOT EXISTS current_updates TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tasks.project_type IS 'Type of project (optional text field)';
COMMENT ON COLUMN tasks.priority IS 'Task priority: Low, Medium, High, or Urgent';
COMMENT ON COLUMN tasks.actual_completion_date IS 'Auto-filled when status changes to Completed';
COMMENT ON COLUMN tasks.comments IS 'General comments about the task';
COMMENT ON COLUMN tasks.current_updates IS 'Current status updates for the task';
