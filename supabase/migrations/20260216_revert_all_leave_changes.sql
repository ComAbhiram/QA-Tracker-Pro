-- REVERT ALL PREVIOUS MIGRATIONS
-- Reset all leave team_ids to NULL, then we'll fix the creation logic instead

UPDATE leaves
SET team_id = NULL
WHERE team_id IS NOT NULL;

-- This will force the application to re-assign team_ids based on the current team context
-- when leaves are viewed/created
