-- Restore projects by matching project names
-- This will re-insert projects that were accidentally deleted

INSERT INTO projects (
    name,
    team_id,
    status,
    created_at
)
SELECT DISTINCT
    po.project_name as name,
    po.team_id,
    'active' as status,
    COALESCE(po.created_at, NOW()) as created_at
FROM project_overview po
WHERE po.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND NOT EXISTS (
        SELECT 1 
        FROM projects p 
        WHERE p.name = po.project_name
        AND p.team_id = po.team_id
    );

-- Show how many were restored
SELECT 
    'Projects restored' as message,
    COUNT(*) as count
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND created_at > NOW() - INTERVAL '1 minute';
