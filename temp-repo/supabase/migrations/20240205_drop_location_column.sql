-- Drop the dependent view first
DROP VIEW IF EXISTS project_overview_with_stats;

-- Drop location column from project_overview table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'location') THEN
        ALTER TABLE project_overview DROP COLUMN location;
    END IF;
END $$;

-- Recreate the view without the location column
-- Note: po.* will now dynamically include all columns currently in project_overview (excluding location)
CREATE OR REPLACE VIEW project_overview_with_stats AS
SELECT 
    po.*,
    (SELECT COUNT(*) FROM tasks WHERE project_name = po.project_name AND team_id = po.team_id) as task_count,
    (SELECT STRING_AGG(DISTINCT assignee, ', ') 
     FROM (
         SELECT assigned_to as assignee FROM tasks WHERE project_name = po.project_name AND team_id = po.team_id AND assigned_to IS NOT NULL
         UNION
         SELECT assigned_to2 as assignee FROM tasks WHERE project_name = po.project_name AND team_id = po.team_id AND assigned_to2 IS NOT NULL
     ) assignees
    ) as resources
FROM project_overview po;

-- Grant permissions again just in case
GRANT SELECT ON project_overview_with_stats TO authenticated;
GRANT SELECT ON project_overview_with_stats TO service_role;
