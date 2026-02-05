-- Create project_overview table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_overview (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_name TEXT NOT NULL,
    team_id UUID NOT NULL,
    
    -- Manual fields required for Project Overview page
    location TEXT,
    pc TEXT, -- Project Coordinator
    tl_confirmed_effort_days NUMERIC,
    blockers TEXT,
    
    -- Other fields supported by the API
    allotted_time_days NUMERIC, -- Sometimes manual, sometimes calculated usage
    expected_effort_days NUMERIC,
    hubstaff_budget TEXT,
    committed_days NUMERIC,
    fixing_text TEXT,
    live_text TEXT,
    budget_text TEXT,
    started_date DATE,
    project_type TEXT,
    category TEXT,
    created_by UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE project_overview ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their team's projects
CREATE POLICY "Users can view their team's projects" ON project_overview
    FOR SELECT
    USING (team_id IN (
        SELECT team_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Create policy to allow users to insert projects for their team
CREATE POLICY "Users can insert projects for their team" ON project_overview
    FOR INSERT
    WITH CHECK (team_id IN (
        SELECT team_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Create policy to allow users to update their team's projects
CREATE POLICY "Users can update their team's projects" ON project_overview
    FOR UPDATE
    USING (team_id IN (
        SELECT team_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Create policy to allow users to delete their team's projects
CREATE POLICY "Users can delete their team's projects" ON project_overview
    FOR DELETE
    USING (team_id IN (
        SELECT team_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Grant access to authenticated users
GRANT ALL ON project_overview TO authenticated;
GRANT ALL ON project_overview TO service_role;
