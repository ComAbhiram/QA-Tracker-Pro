-- 1. Check project_overview table for Talent Training project
SELECT 
    id,
    project_name,
    team_id,
    project_type
FROM project_overview
WHERE project_name ILIKE '%Talent%'
ORDER BY project_name;

-- 2. Check what team_id the QA team has
SELECT id, name FROM teams WHERE name ILIKE '%QA%' OR name ILIKE '%Team Tracker%';

-- 3. Check if Talent Training exists in projects table
SELECT 
    id,
    name,
    team_id
FROM projects
WHERE name ILIKE '%Talent%';
