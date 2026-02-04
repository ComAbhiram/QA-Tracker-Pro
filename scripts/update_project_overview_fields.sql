-- Add new manual entry fields to project_overview table
ALTER TABLE project_overview 
ADD COLUMN IF NOT EXISTS expected_effort_days NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS hubstaff_budget TEXT,
ADD COLUMN IF NOT EXISTS committed_days NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fixing_text TEXT,
ADD COLUMN IF NOT EXISTS live_text TEXT,
ADD COLUMN IF NOT EXISTS budget_text TEXT,
ADD COLUMN IF NOT EXISTS started_date DATE,
ADD COLUMN IF NOT EXISTS project_type TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Update the view to include new fields
CREATE OR REPLACE VIEW project_overview_with_stats AS
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
