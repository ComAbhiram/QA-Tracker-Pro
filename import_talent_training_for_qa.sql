-- Import "Talent Training / Talent" project for QA Team
-- This will make it appear in the task creation dropdown

-- First, check if it already exists in projects table for QA team
SELECT 
    'Existing in projects table' as status,
    id,
    name,
    team_id,
    hubstaff_id
FROM projects
WHERE LOWER(name) LIKE '%talent training%'
  AND team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

-- Get the project details from project_overview
SELECT 
    'Source from project_overview' as status,
    id,
    project_name,
    team_id
FROM project_overview
WHERE project_name = 'Talent Training / Talent'
  AND team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
LIMIT 1;

-- Import the project into projects table
-- Note: Adjust the hubstaff_id if you know it, otherwise use 3943128 from the diagnostic query
INSERT INTO projects (name, team_id, status, description, hubstaff_id, created_at)
SELECT 
    'Talent Training / Talent',
    'ba60298b-8635-4cca-bcd5-7e470fad60e6', -- QA Team ID
    'active',
    'Imported from Hubstaff',
    3943128, -- Hubstaff ID from earlier diagnostic
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE name = 'Talent Training / Talent' 
      AND team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
);

-- Verify the import
SELECT 
    'After import' as status,
    id,
    name,
    team_id,
    hubstaff_id,
    status
FROM projects
WHERE LOWER(name) LIKE '%talent training%'
  AND team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';
