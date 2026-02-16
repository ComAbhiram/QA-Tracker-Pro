-- Check the schema of the projects table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Check if there's a status or is_active field filtering
SELECT 
    status,
    COUNT(*) as count
FROM projects
GROUP BY status;

-- Check if Talent Training has a different status
SELECT 
    id,
    name,
    team_id,
    status,
    created_at
FROM projects
WHERE LOWER(name) LIKE '%talent%'
ORDER BY team_id;
