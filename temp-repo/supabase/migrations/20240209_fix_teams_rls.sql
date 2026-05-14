-- Enable RLS on teams table if not already enabled (good practice, though likely enabled)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Allow public read access for Guest/Manager mode to populate the dropdown
CREATE POLICY "View teams" ON teams
    FOR SELECT
    USING (
        -- Allow authenticated users
        auth.role() = 'authenticated'
        OR
        -- Allow public read access (for manager login dropdown)
        auth.role() = 'anon'
    );
