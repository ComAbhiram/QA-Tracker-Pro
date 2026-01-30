-- Fix: Set team_id for all existing tasks
-- This assigns all tasks without a team_id to the QA Team

-- First, get the QA Team ID
DO $$
DECLARE
    qa_team_id UUID;
BEGIN
    -- Get QA Team ID
    SELECT id INTO qa_team_id FROM teams WHERE name = 'QA Team' LIMIT 1;
    
    IF qa_team_id IS NULL THEN
        RAISE EXCEPTION 'QA Team not found';
    END IF;
    
    -- Update all tasks that don't have a team_id
    UPDATE tasks 
    SET team_id = qa_team_id 
    WHERE team_id IS NULL;
    
    RAISE NOTICE 'Updated % tasks with QA Team ID', (SELECT COUNT(*) FROM tasks WHERE team_id = qa_team_id);
END $$;
