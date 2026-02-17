-- Find projects that exist in project_overview but NOT in projects table
-- These are the projects that were accidentally deleted

SELECT 
    po.id as project_overview_id,
    po.project_name,
    po.team_id,
    po.hubstaff_id,
    po.created_at
FROM project_overview po
LEFT JOIN projects p ON po.hubstaff_id = p.hubstaff_id AND po.team_id = p.team_id
WHERE po.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND p.id IS NULL  -- Projects that DON'T exist in projects table
ORDER BY po.project_name;
