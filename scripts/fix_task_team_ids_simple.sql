-- Quick fix: Assign all tasks to QA Team
-- Run this in Supabase SQL Editor

UPDATE tasks 
SET team_id = (SELECT id FROM teams WHERE name = 'QA Team' LIMIT 1)
WHERE team_id IS NULL;
