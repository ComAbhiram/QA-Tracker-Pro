-- REVERT: First, let's restore all leaves to their original state by clearing team_id
-- Then create a trigger to automatically set correct team_id on insert/update

-- Step 1: Create a function to auto-set team_id based on team_member_id
CREATE OR REPLACE FUNCTION auto_set_leave_team_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If team_member_id is set, get the team_id from user_profiles
    IF NEW.team_member_id IS NOT NULL THEN
        SELECT team_id INTO NEW.team_id
        FROM user_profiles
        WHERE id = NEW.team_member_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to run before insert or update
DROP TRIGGER IF EXISTS set_leave_team_id_trigger ON leaves;
CREATE TRIGGER set_leave_team_id_trigger
    BEFORE INSERT OR UPDATE ON leaves
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_leave_team_id();

-- Step 3: Update all existing leaves to have correct team_id
UPDATE leaves l
SET team_id = up.team_id
FROM user_profiles up
WHERE l.team_member_id = up.id
AND (l.team_id IS NULL OR l.team_id != up.team_id);
