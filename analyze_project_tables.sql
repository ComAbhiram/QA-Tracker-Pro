-- Check the relationship between projects and project_overview tables
-- for the QA team

-- 1. Projects in 'projects' table for QA team
SELECT 
    'In projects table' as source,
    COUNT(*) as count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

-- 2. Projects in 'project_overview' table for QA team
SELECT 
    'In project_overview table' as source,
    COUNT(*) as count
FROM project_overview
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

-- 3. Check if there are projects in 'projects' that DON'T have matching entries in 'project_overview'
SELECT 
    'Projects WITHOUT project_overview match' as source,
    p.id,
    p.name,
    p.hubstaff_id,
    p.status
FROM projects p
LEFT JOIN project_overview po ON p.hubstaff_id = po.hubstaff_id AND p.team_id = po.team_id
WHERE p.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND po.id IS NULL
LIMIT 10;

-- 4. Check manually created projects (no hubstaff_id)
SELECT 
    'Manually created projects (no hubstaff_id)' as source,
    id,
    name,
    team_id,
    status,
    created_at
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND hubstaff_id IS NULL
ORDER BY created_at DESC
LIMIT 10;
