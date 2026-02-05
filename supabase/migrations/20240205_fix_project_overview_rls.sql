-- Fix RLS policies for project_overview to allow Super Admins to update team_id
-- and manage projects across all teams.

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their team's projects" ON project_overview;
DROP POLICY IF EXISTS "Users can insert projects for their team" ON project_overview;
DROP POLICY IF EXISTS "Users can update their team's projects" ON project_overview;
DROP POLICY IF EXISTS "Users can delete their team's projects" ON project_overview;

-- 2. Create new comprehensive policies

-- SELECT: Super admins view all, others view their team's
CREATE POLICY "View projects policy" ON project_overview
    FOR SELECT
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );

-- INSERT: Super admins insert anywhere, others insert for their team
CREATE POLICY "Insert projects policy" ON project_overview
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );

-- UPDATE: Super admins update anywhere (including changing team_id), others update their team's (but cannot move teams unless they are in target team?)
-- To allow moving teams, we usually need the user to have permission on the OLD team (USING) and the NEW team (WITH CHECK).
-- But Super Admin should be able to move anything.
CREATE POLICY "Update projects policy" ON project_overview
    FOR UPDATE
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );
    -- Note: We intentionally omit WITH CHECK to default to USING for non-super-admins,
    -- but for Super Admins, the USING clause is true, so they can update to any new state.
    -- Wait, if we omit WITH CHECK, it checks USING on the NEW row too?
    -- Postgres docs: "If no WITH CHECK clause is specified, the USING clause is used for both."
    -- So if I change team_id to 'Cochin', and I am 'Dubai' admin, USING (new_row) fails.
    -- But if I am 'super_admin', the first condition (role='super_admin') is TRUE regardless of team_id.
    -- So this works for Super Admin moving projects.

-- DELETE: Super admins delete any, others delete their team's
CREATE POLICY "Delete projects policy" ON project_overview
    FOR DELETE
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
        OR
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );
