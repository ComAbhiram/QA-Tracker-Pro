-- Check what projects exist for QA team after migration cleanup
-- QA team_id from console: ba60298b-8635-4cca-bcd5-7e470fad60e6

-- 1. Check projects table for Talent Training with QA team_id
SELECT 
    id,
    name,
    team_id,
    hubstaff_id,
    status,
    created_at
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
  AND name ILIKE '%Talent%';

-- 2. Check ALL Talent Training projects (any team)
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

-- 3. Check project_overview for Talent Training
SELECT 
    id,
    project_name,
    team_id,
    project_type
FROM project_overview
WHERE project_name ILIKE '%Talent%';

-- 4. Check if QA team has ANY projects at all
SELECT COUNT(*) as total_projects
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';
