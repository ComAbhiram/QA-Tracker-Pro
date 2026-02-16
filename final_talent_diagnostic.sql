-- Final diagnostic: Check EVERYTHING about Talent Training for QA team
-- QA team_id: ba60298b-8635-4cca-bcd5-7e470fad60e6

-- 1. All Talent Training projects in projects table
SELECT 
    id,
    name,
    team_id,
    hubstaff_id,
    status,
    created_at,
    CASE 
        WHEN team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6' THEN '✓ QA TEAM'
        ELSE 'Other Team'
    END as team_match
FROM projects
WHERE name ILIKE '%Talent Training%'
ORDER BY created_at DESC;

-- 2. Check RLS policies on projects table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'projects';

-- 3. Test the exact query the API would run
SELECT 
    p.id,
    p.name,
    p.hubstaff_id,
    p.team_id,
    p.status,
    p.description
FROM projects p
WHERE p.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
  AND p.name ILIKE '%talent%'
ORDER BY p.name;
