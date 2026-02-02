-- Add team_id column to leaves table for multi-team support
-- This ensures each team only sees their own leave requests

-- Add team_id column
ALTER TABLE leaves 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leaves_team_id ON leaves(team_id);

-- Update RLS policies to filter by team
-- Drop old policies
DROP POLICY IF EXISTS "Allow authenticated users to read leaves" ON leaves;
DROP POLICY IF EXISTS "Allow authenticated users to insert leaves" ON leaves;
DROP POLICY IF EXISTS "Allow users to update own leaves" ON leaves;
DROP POLICY IF EXISTS "Allow users to delete own leaves" ON leaves;

-- Create new team-based policies
-- Allow users to read leaves from their own team
CREATE POLICY "Allow users to read team leaves"
  ON leaves FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Allow users to insert leaves for their team
CREATE POLICY "Allow users to insert team leaves"
  ON leaves FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Allow users to update leaves from their team
CREATE POLICY "Allow users to update team leaves"
  ON leaves FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Allow users to delete leaves from their team
CREATE POLICY "Allow users to delete team leaves"
  ON leaves FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Add comment
COMMENT ON COLUMN leaves.team_id IS 'Team ID to which this leave request belongs';
