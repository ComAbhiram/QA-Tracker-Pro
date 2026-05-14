-- Consolidate Assignee Names
-- Aswathi -> Aswathi M Ashok
-- Minnu -> Minnu Sebastian

-- Update primary assigned_to
UPDATE tasks 
SET assigned_to = 'Aswathi M Ashok' 
WHERE assigned_to = 'Aswathi';

UPDATE tasks 
SET assigned_to = 'Minnu Sebastian' 
WHERE assigned_to = 'Minnu';

-- Update secondary assigned_to2
UPDATE tasks 
SET assigned_to2 = 'Aswathi M Ashok' 
WHERE assigned_to2 = 'Aswathi';

UPDATE tasks 
SET assigned_to2 = 'Minnu Sebastian' 
WHERE assigned_to2 = 'Minnu';

-- Update additional_assignees (assuming text[])
-- Handle Aswathi
UPDATE tasks
SET additional_assignees = array_replace(additional_assignees, 'Aswathi', 'Aswathi M Ashok')
WHERE 'Aswathi' = ANY(additional_assignees);

-- Handle Minnu
UPDATE tasks
SET additional_assignees = array_replace(additional_assignees, 'Minnu', 'Minnu Sebastian')
WHERE 'Minnu' = ANY(additional_assignees);
