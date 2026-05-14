-- Fix incorrect team_id assignments in leaves table
-- Match leaves to user_profiles by team_member_id and update team_id

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
        -- Find the correct team_id from user_profiles
        -- Cast team_member_id to UUID if it's stored as text
        SELECT team_id INTO correct_team_id
        FROM user_profiles
        WHERE id::text = leave_record.team_member_id::text;

        -- If we found a matching user and the team_id is different, update it
        IF correct_team_id IS NOT NULL AND correct_team_id::text != leave_record.current_team_id::text THEN
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
