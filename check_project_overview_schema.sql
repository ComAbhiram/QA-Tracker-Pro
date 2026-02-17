-- Check the actual schema of project_overview table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'project_overview'
ORDER BY ordinal_position;

-- Also check a sample row to see what data is available
SELECT *
FROM project_overview
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
LIMIT 1;
