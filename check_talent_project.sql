-- Check the state of "Talent Training / Talent" project in database

-- 1. Check projects table
SELECT 
    id,
    name,
    team_id,
    is_imported,
    created_at
FROM projects
WHERE name ILIKE '%Talent Training%' OR name ILIKE '%Talent%'
ORDER BY created_at DESC;

-- 2. Check imported_projects table
SELECT 
    ip.*,
    t.name as team_name
FROM imported_projects ip
LEFT JOIN teams t ON ip.team_id = t.id
WHERE ip.project_name ILIKE '%Talent Training%' OR ip.project_name ILIKE '%Talent%'
ORDER BY ip.imported_at DESC;

-- 3. Check if there are duplicate projects
SELECT 
    name,
    COUNT(*) as count,
    array_agg(id) as project_ids,
    array_agg(team_id) as team_ids,
    array_agg(is_imported) as import_statuses
FROM projects
WHERE name ILIKE '%Talent%'
GROUP BY name
HAVING COUNT(*) > 1;
