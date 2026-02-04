-- Refresh project_overview_with_stats view to include new columns
DROP VIEW IF EXISTS project_overview_with_stats;

CREATE VIEW project_overview_with_stats AS
SELECT 
    po.*,
    -- Count of tasks for this project
    (SELECT COUNT(*) FROM tasks WHERE project_name = po.project_name AND team_id = po.team_id) as task_count,
    -- List of unique resources (assignees) for this project
    (SELECT STRING_AGG(DISTINCT assignee, ', ') 
     FROM (
         SELECT assigned_to as assignee FROM tasks WHERE project_name = po.project_name AND team_id = po.team_id AND assigned_to IS NOT NULL
         UNION
         SELECT assigned_to2 as assignee FROM tasks WHERE project_name = po.project_name AND team_id = po.team_id AND assigned_to2 IS NOT NULL
     ) assignees
    ) as resources
FROM project_overview po;

-- Grant permissions
GRANT SELECT ON project_overview_with_stats TO authenticated;
GRANT SELECT ON project_overview_with_stats TO service_role;
