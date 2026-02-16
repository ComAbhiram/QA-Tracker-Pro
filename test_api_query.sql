-- Check if RLS is blocking the Talent Training projects
-- This tests the EXACT query the API would run

-- Test 1: Direct query (what Supabase Admin should see)
SELECT 
    id,
    name,
    team_id,
    hubstaff_id,
    status
FROM projects
WHERE (team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6' OR team_id IS NULL)
  AND name ILIKE '%Talent%'
ORDER BY name;

-- Test 2: Check if there's a status filter
SELECT 
    id,
    name,
    team_id,
    hubstaff_id,
    status,
    LOWER(status) as status_lower
FROM projects
WHERE name ILIKE '%Talent Training%'
ORDER BY created_at DESC;
