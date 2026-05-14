-- Add weekend schedule columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS include_saturday BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS include_sunday BOOLEAN DEFAULT FALSE;
