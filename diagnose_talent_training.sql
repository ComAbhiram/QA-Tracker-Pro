-- Diagnostic query to understand why "Talent Training" is missing from dropdown
-- This simulates what the /api/projects endpoint does

-- 1. Check if "Talent Training" exists in projects table for QA team
SELECT 
    'Step 1: Check if Talent Training exists' as step,
    COUNT(*) as count,
    string_agg(name, ', ') as project_names
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND name ILIKE '%talent%training%';

-- 2. Check ALL projects for QA team
SELECT 
    'Step 2: Total QA team projects' as step,
    COUNT(*) as count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

-- 3. Check if there are duplicate "Talent Training" projects across teams
SELECT 
    'Step 3: Talent Training across all teams' as step,
    team_id,
    name,
    status,
    created_at
FROM projects
WHERE name ILIKE '%talent%training%'
ORDER BY team_id, created_at;

-- 4. List all QA team projects to see what's there
SELECT 
    name,
    status,
    team_id,
    created_at
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
ORDER BY name
LIMIT 20;
