-- Check ALL sources for "Talent Training" project
-- This will help us understand why it's not appearing in the API response

-- 1. Check projects table
SELECT 'projects table' as source, id, name, team_id, hubstaff_id, status
FROM projects
WHERE LOWER(name) LIKE '%talent%'
ORDER BY name;

-- 2. Check project_overview table
SELECT 'project_overview table' as source, id, project_name as name, team_id, project_type
FROM project_overview
WHERE LOWER(project_name) LIKE '%talent%'
ORDER BY project_name;

-- 3. Check what team_id the QA team should have
SELECT 'teams table' as source, id, name
FROM teams
WHERE LOWER(name) LIKE '%qa%';
