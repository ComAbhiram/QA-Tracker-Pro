-- Add display_order column to team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Optional: Initialize display_order based on current name ordering to avoid random initial order
WITH OrderedMembers AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY name) - 1 as new_order
    FROM team_members
)
UPDATE team_members
SET display_order = OrderedMembers.new_order
FROM OrderedMembers
WHERE team_members.id = OrderedMembers.id;
