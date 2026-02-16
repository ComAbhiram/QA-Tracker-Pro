-- Run query 2 to see the QA team ID
SELECT id, name FROM teams WHERE name ILIKE '%QA%' OR name ILIKE '%Team Tracker%';

-- Check project_overview for Talent Training
SELECT 
    id,
    project_name,
    team_id,
    project_type
FROM project_overview
WHERE project_name ILIKE '%Talent%'
ORDER BY project_name;
