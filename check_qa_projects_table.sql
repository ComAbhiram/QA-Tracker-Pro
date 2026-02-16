-- Check what projects exist in the projects table for QA team
SELECT 
    'Projects table - QA Team' as source,
    COUNT(*) as total_count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

-- List all projects for QA team
SELECT 
    'Projects for QA Team' as source,
    id,
    name,
    team_id,
    status,
    hubstaff_id
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
ORDER BY name;

-- Check if Talent Training exists in projects table
SELECT 
    'Talent Training in projects table' as source,
    id,
    name,
    team_id,
    status
FROM projects
WHERE LOWER(name) LIKE '%talent%'
ORDER BY team_id;
