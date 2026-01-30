-- Add sprint_link column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_link TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.sprint_link IS 'Link to sprint or task tracking system';
