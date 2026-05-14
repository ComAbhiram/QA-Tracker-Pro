-- Add missing columns to project_overview table if they don't exist
-- We use a DO block to check for existence to avoid errors

DO $$
BEGIN
    -- expected_effort_days
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'expected_effort_days') THEN
        ALTER TABLE project_overview ADD COLUMN expected_effort_days NUMERIC(10, 2);
    END IF;

    -- hubstaff_budget
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'hubstaff_budget') THEN
        ALTER TABLE project_overview ADD COLUMN hubstaff_budget TEXT;
    END IF;

    -- committed_days
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'committed_days') THEN
        ALTER TABLE project_overview ADD COLUMN committed_days NUMERIC(10, 2);
    END IF;

    -- fixing_text
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'fixing_text') THEN
        ALTER TABLE project_overview ADD COLUMN fixing_text TEXT;
    END IF;

    -- live_text
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'live_text') THEN
        ALTER TABLE project_overview ADD COLUMN live_text TEXT;
    END IF;

    -- budget_text
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'budget_text') THEN
        ALTER TABLE project_overview ADD COLUMN budget_text TEXT;
    END IF;

    -- started_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'started_date') THEN
        ALTER TABLE project_overview ADD COLUMN started_date DATE;
    END IF;

    -- project_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'project_type') THEN
        ALTER TABLE project_overview ADD COLUMN project_type TEXT;
    END IF;

    -- category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'category') THEN
        ALTER TABLE project_overview ADD COLUMN category TEXT;
    END IF;

END $$;

-- Verify policies exist, if not create them (handling the "already exists" error gracefully)
-- We can't easily check for policy existence in a cross-database compliant way simply, 
-- but we can drop and recreate OR just assume if table existed the user's old schema setup policies.
-- Let's ensure the necessary policies for the API are present.

-- Drop policies to ensure clean slate (safe if we re-declare exact same logic)
DROP POLICY IF EXISTS "Users can view their team's projects" ON project_overview;
DROP POLICY IF EXISTS "Users can create projects for their team" ON project_overview;
DROP POLICY IF EXISTS "Users can insert projects for their team" ON project_overview; -- Handling naming variation
DROP POLICY IF EXISTS "Users can update their team's projects" ON project_overview;
DROP POLICY IF EXISTS "Users can delete their team's projects" ON project_overview;

-- Recreate Policies
CREATE POLICY "Users can view their team's projects" ON project_overview
    FOR SELECT USING (team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert projects for their team" ON project_overview
    FOR INSERT WITH CHECK (team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their team's projects" ON project_overview
    FOR UPDATE USING (team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their team's projects" ON project_overview
    FOR DELETE USING (team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()));
