-- Check the current schema to understand the design
-- 1. Check projects table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 2. Check if there's a junction table for team-project relationships
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%project%team%' OR table_name LIKE '%team%project%';

-- 3. Check for unique constraints on projects
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'projects'
ORDER BY tc.constraint_type, kcu.ordinal_position;

-- 4. Check how many teams have imported the same project
SELECT 
    name,
    COUNT(DISTINCT team_id) as team_count,
    array_agg(DISTINCT team_id) as team_ids
FROM projects
GROUP BY name
HAVING COUNT(DISTINCT team_id) > 1
ORDER BY team_count DESC
LIMIT 10;
