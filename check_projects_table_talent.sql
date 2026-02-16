-- Check if Talent Training exists in the projects table
SELECT 
    'projects table' as source,
    id,
    name,
    team_id,
    hubstaff_id,
    status
FROM projects
WHERE LOWER(name) LIKE '%talent training%'
ORDER BY team_id;

-- Check project_overview for QA team specifically
SELECT 
    'project_overview - QA Team' as source,
    id,
    project_name,
    team_id
FROM project_overview
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
  AND LOWER(project_name) LIKE '%talent%';
