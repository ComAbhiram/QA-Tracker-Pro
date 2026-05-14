-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to DELETE tasks that belong to their team
CREATE POLICY "Enable delete for team members" ON tasks
    FOR DELETE
    TO authenticated
    USING (
        team_id IN (
            SELECT team_id 
            FROM user_profiles 
            WHERE id = auth.uid() -- user_profiles.id is usually linked to auth.users.id
        )
    );

-- Just in case user_profiles uses 'user_id' column instead of 'id' as FK to auth.users
-- (I recall viewing user_profiles earlier? No. viewing route.ts line 36: .eq('id', user.id))
-- So user_profiles.id IS the auth user id.

-- Fallback: If no team_id on tasks, allow if user is assigned
CREATE POLICY "Enable delete for assignees" ON tasks
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM user_profiles WHERE name = tasks.assigned_to
        )
    );
