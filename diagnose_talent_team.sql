-- Check what team "Talent Training / Talent" belongs to
SELECT 
    po.project_name,
    po.team_id as project_overview_team_id,
    t.name as team_name,
    po.project_type
FROM project_overview po
LEFT JOIN teams t ON po.team_id = t.id
WHERE LOWER(po.project_name) LIKE '%talent training%'
   OR LOWER(po.project_name) LIKE '%talent / talent%';

-- Also check if QA team ID matches
SELECT 
    'QA Team ID' as label,
    id as team_id,
    name as team_name
FROM teams
WHERE LOWER(name) LIKE '%qa%';

-- Check if there's a Talent Training in projects table
SELECT 
    p.name,
    p.team_id,
    t.name as team_name,
    p.hubstaff_id
FROM projects p
LEFT JOIN teams t ON p.team_id = t.id
WHERE LOWER(p.name) LIKE '%talent%';
