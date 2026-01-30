-- Fix RLS policies for teams table
-- This allows super_admin to create and manage teams

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super Admin: Manage Teams" ON teams;
DROP POLICY IF EXISTS "Super Admin: View All Teams" ON teams;

-- Allow super_admin to view all teams
CREATE POLICY "Super Admin: View All Teams" ON teams
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Allow super_admin to create, update, and delete teams
CREATE POLICY "Super Admin: Manage Teams" ON teams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );
