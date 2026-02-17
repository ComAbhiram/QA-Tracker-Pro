-- Check current state of projects for QA team
-- This will help us understand if the restore worked or if projects already exist

-- 1. Count projects in each table
SELECT 
    'projects table' as source,
    COUNT(*) as count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
UNION ALL
SELECT 
    'project_overview table' as source,
    COUNT(*) as count
FROM project_overview
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

-- 2. Check if "Talent Training" exists in projects table
SELECT 
    'Talent Training in projects?' as check_type,
    COUNT(*) as exists_count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND name ILIKE '%talent%training%';

-- 3. Check if "Talent Training" exists in project_overview
SELECT 
    'Talent Training in project_overview?' as check_type,
    COUNT(*) as exists_count
FROM project_overview
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND project_name ILIKE '%talent%training%';

-- 4. Show sample project names from both tables to compare
SELECT 'Sample from projects' as source, name
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
ORDER BY name
LIMIT 5;

SELECT 'Sample from project_overview' as source, project_name as name
FROM project_overview
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
ORDER BY project_name
LIMIT 5;
