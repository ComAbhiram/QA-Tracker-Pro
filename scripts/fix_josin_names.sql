-- update_josin.sql

-- 1. Update assigned_to column
UPDATE tasks
SET assigned_to = 'Josin Joseph'
WHERE assigned_to = 'Josin';

-- 2. Update assigned_to2 column
UPDATE tasks
SET assigned_to2 = 'Josin Joseph'
WHERE assigned_to2 = 'Josin';

-- 3. Update additional_assignees (Array/JSONB check)
-- Assuming additional_assignees is text[] or jsonb?
-- Build schema check later if needed, but for now simple update for text columns

-- 4. Update team_members if needed
UPDATE team_members
SET name = 'Josin Joseph'
WHERE name = 'Josin';
