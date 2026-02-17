-- Check what columns project_overview actually has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'project_overview'
ORDER BY ordinal_position;

-- Also show a sample row
SELECT *
FROM project_overview
LIMIT 1;
