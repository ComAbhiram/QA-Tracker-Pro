-- Fix incorrect team_id assignments in leaves table (v2)
-- Match by both team_member_id AND team_member_name

DO $$
DECLARE
    updated_count INTEGER := 0;
    leave_record RECORD;
    correct_team_id UUID;
BEGIN
    -- Loop through all leaves
    FOR leave_record IN 
        SELECT l.id, l.team_member_id, l.team_member_name, l.team_id as current_team_id
        FROM leaves l
    LOOP
        correct_team_id := NULL;
        
        -- First try to match by team_member_id
        IF leave_record.team_member_id IS NOT NULL THEN
            SELECT team_id INTO correct_team_id
            FROM user_profiles
            WHERE id::text = leave_record.team_member_id::text;
        END IF;
        
        -- If no match by ID, try matching by name
        IF correct_team_id IS NULL AND leave_record.team_member_name IS NOT NULL THEN
            SELECT team_id INTO correct_team_id
            FROM user_profiles
            WHERE full_name = leave_record.team_member_name
            LIMIT 1;
        END IF;

        -- If we found a matching user and the team_id is different, update it
        IF correct_team_id IS NOT NULL AND correct_team_id::text != COALESCE(leave_record.current_team_id::text, '') THEN
            UPDATE leaves
            SET team_id = correct_team_id
            WHERE id = leave_record.id;

            updated_count := updated_count + 1;
            
            RAISE NOTICE 'Updated leave % for % from team % to team %', 
                leave_record.id, 
                leave_record.team_member_name,
                leave_record.current_team_id,
                correct_team_id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Total leaves updated: %', updated_count;
END $$;
