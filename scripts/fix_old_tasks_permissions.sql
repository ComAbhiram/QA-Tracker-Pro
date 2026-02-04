-- Fix permissions for old tasks by assigning them to the main QA Team
-- This ensures they are visible and editable by the Super Admin

-- 1. Update tasks with NULL team_id
UPDATE tasks 
SET team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6' 
WHERE team_id IS NULL;

-- 2. Verify and Update tasks that might have been created with a different team_id context
-- (Optional: heavily depends on if multiple teams exist. For now, we assume single tenant migration)
-- If there are only a few teams, we might want to consolidate.
-- But the main issue "old tasks" implies NULL or legacy ID.

-- 3. Also ensure proper status normalization
UPDATE tasks
SET status = 'Rejected'
WHERE status ILIKE 'rejected';

-- 4. Enable RLS is already done, but ensuring policies allow update
-- The policy "Strict: Modify Own Team Tasks" relies on user_profiles.team_id matching tasks.team_id
-- So we must ensure the admin's team_id is indeed 'ba60298b-8635-4cca-bcd5-7e470fad60e6'

DO $$
BEGIN
    RAISE NOTICE 'Updated tasks to default team ID.';
END $$;
