-- Project Overview Feature - Database Schema
-- This script creates the necessary tables and policies for the Project Overview feature

-- Create project_overview table
CREATE TABLE IF NOT EXISTS project_overview (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    location TEXT CHECK (location IN ('Dubai', 'Cochin')),
    pc TEXT, -- Project Coordinator (auto-populated from tasks)
    allotted_time_days NUMERIC(10, 2), -- Manual entry
    tl_confirmed_effort_days NUMERIC(10, 2), -- Manual entry
    blockers TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(project_name, team_id) -- Prevent duplicate projects per team
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_overview_team ON project_overview(team_id);
CREATE INDEX IF NOT EXISTS idx_project_overview_location ON project_overview(location);
CREATE INDEX IF NOT EXISTS idx_project_overview_project_name ON project_overview(project_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_overview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_overview_updated_at
    BEFORE UPDATE ON project_overview
    FOR EACH ROW
    EXECUTE FUNCTION update_project_overview_updated_at();

-- Enable Row Level Security
ALTER TABLE project_overview ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_overview

-- Policy: Users can view projects from their team
CREATE POLICY "Users can view their team's projects"
    ON project_overview
    FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert projects for their team
CREATE POLICY "Users can create projects for their team"
    ON project_overview
    FOR INSERT
    WITH CHECK (
        team_id IN (
            SELECT team_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update projects from their team
CREATE POLICY "Users can update their team's projects"
    ON project_overview
    FOR UPDATE
    USING (
        team_id IN (
            SELECT team_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete projects from their team
CREATE POLICY "Users can delete their team's projects"
    ON project_overview
    FOR DELETE
    USING (
        team_id IN (
            SELECT team_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Create a view for project overview with calculated fields
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

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON project_overview TO authenticated;
GRANT SELECT ON project_overview_with_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE project_overview IS 'Stores project overview data with manual and calculated fields';
COMMENT ON COLUMN project_overview.project_name IS 'Name of the project (must match tasks.project_name)';
COMMENT ON COLUMN project_overview.team_id IS 'Reference to the team that owns this project';
COMMENT ON COLUMN project_overview.location IS 'Project location: Dubai or Cochin';
COMMENT ON COLUMN project_overview.pc IS 'Project Coordinator name (auto-populated from tasks)';
COMMENT ON COLUMN project_overview.allotted_time_days IS 'Manually entered allocated time in days';
COMMENT ON COLUMN project_overview.tl_confirmed_effort_days IS 'Team Lead confirmed effort in days';
COMMENT ON COLUMN project_overview.blockers IS 'Text description of any blockers or issues';
