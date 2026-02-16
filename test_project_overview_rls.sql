-- Test if project_overview RLS is blocking queries
-- Run this as the service role to see if RLS is the issue

SELECT 
    'Total projects in project_overview' as check_type,
    COUNT(*) as count
FROM project_overview;

SELECT 
    'Talent Training projects in project_overview' as check_type,
    COUNT(*) as count
FROM project_overview
WHERE LOWER(project_name) LIKE '%talent%';

SELECT 
    'All Talent Training entries' as check_type,
    id,
    project_name,
    team_id
FROM project_overview
WHERE LOWER(project_name) LIKE '%talent%'
ORDER BY team_id;
