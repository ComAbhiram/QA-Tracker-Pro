-- Check why projects aren't appearing in dropdown
-- The diagnostic shows "Talent Training" exists, so the issue must be in the API filtering

-- 1. Check if there's a status filter issue
SELECT 
    'Projects by status' as check,
    status,
    COUNT(*) as count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
GROUP BY status;

-- 2. Check if "Talent Training" has a weird status
SELECT 
    name,
    status,
    team_id,
    created_at
FROM projects
WHERE name ILIKE '%talent%training%'
    AND team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

-- 3. Check for NULL or empty status
SELECT 
    'Projects with NULL or empty status' as check,
    COUNT(*) as count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND (status IS NULL OR status = '');
