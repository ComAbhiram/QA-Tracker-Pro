-- Simple check: Does "Talent Training" exist for QA team?
SELECT 
    id,
    name,
    status,
    team_id,
    created_at
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND LOWER(name) LIKE '%talent%training%'
ORDER BY created_at DESC
LIMIT 5;

-- Count total projects for QA team
SELECT COUNT(*) as total_qa_projects
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

-- Check for any projects with NULL or weird status
SELECT 
    status,
    COUNT(*) as count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
GROUP BY status;
