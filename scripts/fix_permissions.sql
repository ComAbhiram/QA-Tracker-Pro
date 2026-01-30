-- 1. DROP ALL EXISTING POLICIES to ensure no permissive rules remain
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    -- Drop policies on tasks
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON tasks'; 
    END LOOP;

    -- Drop policies on projects
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'projects' LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON projects'; 
    END LOOP;
    
    -- Drop policies on teams
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'teams' LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON teams'; 
    END LOOP;

    -- Drop policies on user_profiles
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON user_profiles'; 
    END LOOP;
END $$;

-- 2. Assign unassigned (legacy) tasks and projects to the QA Team
-- (Using the QA Team ID found in debug: ba60298b-8635-4cca-bcd5-7e470fad60e6)
UPDATE tasks 
SET team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6' 
WHERE team_id IS NULL;

UPDATE projects 
SET team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6' 
WHERE team_id IS NULL;

-- 3. Ensure RLS is Enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_members ENABLE ROW LEVEL SECURITY;

-- QA MEMBERS (Allow read access to authenticated users, strict logic if needed)
CREATE POLICY "Allow read access to authenticated users" ON qa_members
    FOR SELECT USING (auth.role() = 'authenticated');


-- 4. Create Strict Policies

-- TASKS
CREATE POLICY "Strict: View Own Team Tasks" ON tasks
    FOR SELECT USING (
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );

CREATE POLICY "Strict: Modify Own Team Tasks" ON tasks
    FOR ALL
    USING ( team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()) )
    WITH CHECK ( team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()) );

-- PROJECTS
CREATE POLICY "Strict: View Own Team Projects" ON projects
    FOR SELECT USING (
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );

CREATE POLICY "Strict: Insert Own Team Projects" ON projects
    FOR INSERT
    WITH CHECK ( team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()) );

CREATE POLICY "Strict: Update Own Team Projects" ON projects
    FOR UPDATE
    USING ( team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()) )
    WITH CHECK ( team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()) );
    
CREATE POLICY "Strict: Delete Own Team Projects" ON projects
    FOR DELETE
    USING ( team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid()) );

-- TEAMS
CREATE POLICY "Strict: View Own Team" ON teams
    FOR SELECT USING (
        id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );

-- PROFILES
CREATE POLICY "Strict: View Own Profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);
