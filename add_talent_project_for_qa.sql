-- Manually add "Talent Training / Talent" project for QA team
-- This is needed because the migration cleanup removed it

INSERT INTO projects (name, team_id, hubstaff_id, status, description)
VALUES (
    'Talent Training / Talent',
    'ba60298b-8635-4cca-bcd5-7e470fad60e6', -- QA team_id from console
    1243, -- hubstaff_id from the existing records
    'Active',
    'Imported from Hubstaff'
)
ON CONFLICT (hubstaff_id, team_id) DO NOTHING;

-- Verify it was added
SELECT id, name, team_id, hubstaff_id, status
FROM projects
WHERE team_id = 'ba60298b-8635-4cca-bcd5-7e470fad60e6'
  AND name ILIKE '%Talent%';
