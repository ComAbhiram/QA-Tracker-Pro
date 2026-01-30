-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create 'QA Team' if it doesn't exist
INSERT INTO teams (id, name)
SELECT uuid_generate_v4(), 'QA Team'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'QA Team');

-- Capture the QA Team ID for migration
DO $$
DECLARE
    qa_team_id UUID;
BEGIN
    SELECT id INTO qa_team_id FROM teams WHERE name = 'QA Team' LIMIT 1;

    -- 3. Add team_id to tasks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'team_id') THEN
        ALTER TABLE tasks ADD COLUMN team_id UUID REFERENCES teams(id);
        -- Migrate existing data
        UPDATE tasks SET team_id = qa_team_id WHERE team_id IS NULL;
    END IF;

    -- 4. Add team_id to projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'team_id') THEN
        ALTER TABLE projects ADD COLUMN team_id UUID REFERENCES teams(id);
        -- Migrate existing data
        UPDATE projects SET team_id = qa_team_id WHERE team_id IS NULL;
    END IF;
    
    -- 5. Add team_id to team_members if exists (or create it properly)
    -- Assuming a table exists for QA members from context (qa_members_migration.sql?)
    -- If not, we skip.
END $$;

-- 6. Create User Profiles Table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    full_name TEXT,
    role TEXT CHECK (role IN ('super_admin', 'team_admin', 'member')),
    team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 8. Policies (Examples - adjust as needed)
-- Users can see their own team's data
CREATE POLICY "Users can view own team tasks" ON tasks
    FOR SELECT USING (team_id IN (
        SELECT team_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert own team tasks" ON tasks
    FOR INSERT WITH CHECK (team_id IN (
        SELECT team_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Same for projects
CREATE POLICY "Users can view own team projects" ON projects
    FOR SELECT USING (team_id IN (
        SELECT team_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Super Admin can see everything (requires a way to bypass or sophisticated policies)
-- Usually Super Admins might just have a `team_id` or we use a separate policy.
