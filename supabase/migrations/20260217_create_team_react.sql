-- Migration to create Team React
-- Date: 2026-02-17

-- 1. Create the team
INSERT INTO public.teams (name)
VALUES ('Team React')
ON CONFLICT (name) DO NOTHING;

-- 2. Link the admin user (saneesh@intersmart.in) to the new team
-- This handles the case where the user already exists in auth.users
DO $$
DECLARE
    target_team_id UUID;
    target_user_id UUID;
    v_email TEXT := 'saneesh@intersmart.in';
BEGIN
    -- Get the team ID (using the UUID provided by the user)
    target_team_id := 'aede842e-b950-4ce6-9480-4b9284936604';
    
    -- Get the existing user ID from Auth (case-insensitive lookup)
    SELECT id INTO target_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_email);
    
    IF target_user_id IS NOT NULL THEN
        -- Link user to team with the correct 'team_admin' role
        INSERT INTO public.user_profiles (id, email, team_id, role, full_name)
        VALUES (target_user_id, LOWER(v_email), target_team_id, 'team_admin', 'Saneesh')
        ON CONFLICT (id) DO UPDATE 
        SET team_id = target_team_id, 
            role = 'team_admin',
            email = EXCLUDED.email;
            
        RAISE NOTICE 'Linked user % to Team React with role team_admin', v_email;
    ELSE
        IF target_team_id IS NULL THEN
            RAISE EXCEPTION 'Team React was not found or could not be created.';
        END IF;
        IF target_user_id IS NULL THEN
            RAISE NOTICE 'User % not found in auth.users. Please create the user manually in the Supabase Auth Dashboard (Step 3 in your instructions) to set their password.', v_email;
        END IF;
    END IF;
END $$;
