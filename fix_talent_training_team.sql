-- Fix: Update Talent Training project to belong to QA team
-- This will make it appear in the QA team's project dropdown

-- First, verify current state
SELECT 
    'BEFORE UPDATE' as status,
    project_name,
    team_id,
    project_type
FROM project_overview
WHERE LOWER(project_name) LIKE '%talent training%';

-- Update the team_id to QA team
UPDATE project_overview
SET team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'  -- QA Team ID
WHERE project_name = 'Talent Training / Talent';

-- Verify the update
SELECT 
    'AFTER UPDATE' as status,
    project_name,
    team_id,
    project_type
FROM project_overview
WHERE LOWER(project_name) LIKE '%talent training%';
