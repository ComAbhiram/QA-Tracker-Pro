-- Restore accidentally deleted projects by re-inserting them into projects table
-- This will fix the "already imported" error and make them appear in dropdowns

INSERT INTO projects (
    name,
    team_id,
    hubstaff_id,
    status,
    description,
    created_at,
    updated_at
)
SELECT 
    po.project_name as name,
    po.team_id,
    po.hubstaff_id,
    'active' as status,  -- Default to active
    NULL as description,
    po.created_at,
    NOW() as updated_at
FROM project_overview po
LEFT JOIN projects p ON po.hubstaff_id = p.hubstaff_id AND po.team_id = p.team_id
WHERE po.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND p.id IS NULL  -- Only insert projects that DON'T exist in projects table
    AND po.hubstaff_id IS NOT NULL  -- Only restore Hubstaff projects (not manual ones)
ON CONFLICT (hubstaff_id, team_id) DO NOTHING;  -- Skip if already exists

-- Show what was restored
SELECT 
    'Restored projects' as action,
    COUNT(*) as count
FROM projects p
INNER JOIN project_overview po ON p.hubstaff_id = po.hubstaff_id AND p.team_id = po.team_id
WHERE p.team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
    AND p.updated_at > NOW() - INTERVAL '1 minute';
