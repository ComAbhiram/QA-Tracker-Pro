-- Add additional_assignees column to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'additional_assignees') THEN
        ALTER TABLE tasks ADD COLUMN additional_assignees text[] DEFAULT '{}';
    END IF;
END $$;
