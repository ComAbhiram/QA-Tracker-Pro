-- Fix ALL existing leave records to have correct team_id
-- This migration updates leaves to match the team_id from team_members table

DO $$
DECLARE
    updated_count INTEGER := 0;
    leave_record RECORD;
    correct_team_id UUID;
BEGIN
    RAISE NOTICE 'Starting leave team_id correction...';
    
    -- Loop through all leaves
    FOR leave_record IN 
        SELECT id, team_member_id, team_member_name, team_id as current_team_id
        FROM leaves
    LOOP
        correct_team_id := NULL;
        
        -- Try to find the correct team_id from team_members table
        IF leave_record.team_member_id IS NOT NULL THEN
            SELECT team_id INTO correct_team_id
            FROM team_members
            WHERE id::text = leave_record.team_member_id::text
            LIMIT 1;
        END IF;
        
        -- If not found by ID, try matching by name
        IF correct_team_id IS NULL AND leave_record.team_member_name IS NOT NULL THEN
            SELECT team_id INTO correct_team_id
            FROM team_members
            WHERE name = leave_record.team_member_name
            LIMIT 1;
        END IF;

        -- Update if we found a correct team_id and it's different from current
        IF correct_team_id IS NOT NULL AND 
           (leave_record.current_team_id IS NULL OR 
            correct_team_id::text != leave_record.current_team_id::text) THEN
            
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

    RAISE NOTICE 'Migration complete! Updated % leave records', updated_count;
END $$;
