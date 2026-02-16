-- Debug query to check what's happening with Talent Training project
-- Run this to see the current state

-- 1. Check all Talent Training projects in projects table
SELECT 
    id,
    name,
    team_id,
    hubstaff_id,
    status,
    created_at
FROM projects
WHERE name ILIKE '%Talent%'
ORDER BY created_at DESC;

-- 2. Check project_overview
SELECT 
    id,
    project_name,
    team_id,
    project_type
FROM project_overview
WHERE project_name ILIKE '%Talent%';

-- 3. Check what team_id you're using (QA team)
SELECT id, name FROM teams WHERE name ILIKE '%QA%' OR name ILIKE '%Team%';

-- 4. Check if there are any projects with NULL team_id
SELECT COUNT(*) as null_team_count
FROM projects
WHERE team_id IS NULL;
