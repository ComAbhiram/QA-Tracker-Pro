-- Simplified restore - match by project NAME only
-- This will restore projects that exist in project_overview but not in projects

-- First, preview what will be restored
SELECT 
    po.project_name,
    po.team_id,
    po.created_at
FROM project_overview po
WHERE po.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND NOT EXISTS (
        SELECT 1 
        FROM projects p 
        WHERE p.name = po.project_name
        AND p.team_id = po.team_id
    )
ORDER BY po.project_name;
