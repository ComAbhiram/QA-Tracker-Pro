-- Leave Management System Database Schema
-- This script creates the necessary tables for managing team member leaves

-- Create leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id BIGSERIAL PRIMARY KEY,
  team_member_id TEXT NOT NULL,
  team_member_name TEXT NOT NULL,
  leave_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Sick Leave', 'Casual Leave', 'Vacation', 'Personal Leave', 'Emergency Leave', 'Other')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leaves_date ON leaves(leave_date);
CREATE INDEX IF NOT EXISTS idx_leaves_member ON leaves(team_member_id);
CREATE INDEX IF NOT EXISTS idx_leaves_created_at ON leaves(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leaves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS trigger_update_leaves_updated_at ON leaves;
CREATE TRIGGER trigger_update_leaves_updated_at
  BEFORE UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION update_leaves_updated_at();

-- Enable Row Level Security
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Create policies for leaves table
-- Allow authenticated users to read all leaves
CREATE POLICY "Allow authenticated users to read leaves"
  ON leaves FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert leaves
CREATE POLICY "Allow authenticated users to insert leaves"
  ON leaves FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own leaves
CREATE POLICY "Allow users to update own leaves"
  ON leaves FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Allow users to delete their own leaves
CREATE POLICY "Allow users to delete own leaves"
  ON leaves FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Grant permissions
GRANT ALL ON leaves TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE leaves_id_seq TO authenticated;

-- Add comment to table
COMMENT ON TABLE leaves IS 'Stores leave requests for team members';
COMMENT ON COLUMN leaves.team_member_id IS 'Hubstaff user ID';
COMMENT ON COLUMN leaves.team_member_name IS 'Display name of the team member';
COMMENT ON COLUMN leaves.leave_date IS 'Date of the leave';
COMMENT ON COLUMN leaves.leave_type IS 'Type of leave (Sick, Casual, Vacation, etc.)';
COMMENT ON COLUMN leaves.reason IS 'Reason for the leave request';
