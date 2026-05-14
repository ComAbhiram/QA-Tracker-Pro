-- Fix user_profiles and leaves for Frontend team members
-- Samir Mulashiya, Jostin Joseph, and Sreegith VA should be in Frontend team

DO $$
DECLARE
    frontend_team_id UUID;
    updated_profiles INTEGER := 0;
    updated_leaves INTEGER := 0;
BEGIN
    -- Find the Frontend developers team ID
    SELECT id INTO frontend_team_id
    FROM teams
    WHERE name = 'Frontend developers'
    LIMIT 1;
    
    IF frontend_team_id IS NULL THEN
        RAISE EXCEPTION 'Frontend developers team not found!';
    END IF;
    
    RAISE NOTICE 'Frontend team ID: %', frontend_team_id;
    
    -- Update user_profiles for Frontend team members
    UPDATE user_profiles
    SET team_id = frontend_team_id
    WHERE full_name IN ('Samir Mulashiya', 'Jostin Joseph', 'Sreegith VA');
    
    GET DIAGNOSTICS updated_profiles = ROW_COUNT;
    RAISE NOTICE 'Updated % user profiles to Frontend team', updated_profiles;
    
    -- Update their leave records to match
    UPDATE leaves
    SET team_id = frontend_team_id
    WHERE team_member_name IN ('Samir Mulashiya', 'Jostin Joseph', 'Sreegith VA');
    
    GET DIAGNOSTICS updated_leaves = ROW_COUNT;
    RAISE NOTICE 'Updated % leave records to Frontend team', updated_leaves;
    
    RAISE NOTICE 'Done! Profiles: %, Leaves: %', updated_profiles, updated_leaves;
END $$;
