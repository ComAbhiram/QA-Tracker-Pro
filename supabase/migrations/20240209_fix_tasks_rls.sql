-- Fix RLS policies for tasks table to allow INSERT/UPDATE strategies
-- This is necessary because the previous "ENABLE ROW LEVEL SECURITY" blocked insertions by default without a policy.

-- 1. DROP existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "View tasks" ON tasks;
DROP POLICY IF EXISTS "Insert tasks" ON tasks;
DROP POLICY IF EXISTS "Update tasks" ON tasks;
DROP POLICY IF EXISTS "Delete tasks" ON tasks;
-- Note: "Enable delete for team members" might exist from previous migration.
-- We can leave it or redefine it. Let's strictly define comprehensive policies here.

-- Toggle RLS just to be sure
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy
-- Users can see tasks if they are Super Admin OR if the task belongs to their Team OR if they are assigned.
CREATE POLICY "View tasks" ON tasks
    FOR SELECT
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
        OR
        assigned_to = (SELECT name FROM user_profiles WHERE id = auth.uid())
        OR
        assigned_to2 = (SELECT name FROM user_profiles WHERE id = auth.uid())
    );

-- 3. INSERT Policy
-- Users can insert tasks if they are Super Admin OR if they belong to a team (for that team).
-- We check that the new row's team_id matches the user's team_id (unless super_admin).
CREATE POLICY "Insert tasks" ON tasks
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );

-- 4. UPDATE Policy
-- Users can update tasks if Super Admin, Team Member, or Assignee.
CREATE POLICY "Update tasks" ON tasks
    FOR UPDATE
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
        OR
        assigned_to = (SELECT name FROM user_profiles WHERE id = auth.uid())
        OR
        assigned_to2 = (SELECT name FROM user_profiles WHERE id = auth.uid())
    );

-- 5. DELETE Policy
-- Keep consistent with previous logic: Super Admins or Team Members can delete.
CREATE POLICY "Delete tasks" ON tasks
    FOR DELETE
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );
