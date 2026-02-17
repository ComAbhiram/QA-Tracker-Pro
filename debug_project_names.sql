-- Debug: Check if project names match between tables
-- This will help us understand why the .in('name') filter isn't working

-- 1. Sample project names from 'projects' table for QA team
SELECT 
    'Projects table names' as source,
    name
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
ORDER BY name
LIMIT 10;

-- 2. Sample project names from 'project_overview' table for QA team
SELECT 
    'Project_overview table names' as source,
    name
FROM project_overview
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
ORDER BY name
LIMIT 10;

-- 3. Check for exact name matches
SELECT 
    'Matching names' as source,
    p.name
FROM projects p
INNER JOIN project_overview po ON p.name = po.name AND p.team_id = po.team_id
WHERE p.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
LIMIT 10;

-- 4. Check total counts
SELECT 
    (SELECT COUNT(*) FROM projects WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6') as projects_count,
    (SELECT COUNT(*) FROM project_overview WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6') as project_overview_count,
    (SELECT COUNT(*) 
     FROM projects p
     INNER JOIN project_overview po ON p.name = po.name AND p.team_id = po.team_id
     WHERE p.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6') as matching_count;
