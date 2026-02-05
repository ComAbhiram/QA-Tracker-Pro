-- Comprehensive Task Deletion Policies

-- 1. Drop existing delete policies to avoid conflicts
DROP POLICY IF EXISTS "Enable delete for team members" ON tasks;
DROP POLICY IF EXISTS "Enable delete for assignees" ON tasks;
DROP POLICY IF EXISTS "Allow delete for super admins" ON tasks;
DROP POLICY IF EXISTS "Enable delete for orphan tasks" ON tasks;

-- 2. Policy: Super Admins can delete anything
CREATE POLICY "Allow delete for super admins" ON tasks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- 3. Policy: Team Members can delete tasks in their team
CREATE POLICY "Enable delete for team members" ON tasks
    FOR DELETE
    TO authenticated
    USING (
        team_id IN (
            SELECT team_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- 4. Policy: Assignees can delete their own tasks (Using full_name)
CREATE POLICY "Enable delete for assignees" ON tasks
    FOR DELETE
    TO authenticated
    USING (
        assigned_to IN (
            SELECT full_name FROM user_profiles WHERE id = auth.uid()
        )
        OR
        assigned_to2 IN (
            SELECT full_name FROM user_profiles WHERE id = auth.uid()
        )
    );

-- 5. Fallback: Authenticated users can delete orphan tasks
CREATE POLICY "Enable delete for orphan tasks" ON tasks
    FOR DELETE
    TO authenticated
    USING (
        team_id IS NULL
    );
