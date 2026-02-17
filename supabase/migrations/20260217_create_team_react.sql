-- Migration to create Team React
-- Date: 2026-02-17

-- 1. Create the team
INSERT INTO public.teams (name)
VALUES ('Team React')
ON CONFLICT (name) DO NOTHING;

-- 2. Get the team ID (for subsequent steps if needed)
-- SELECT id FROM public.teams WHERE name = 'Team React';

-- NOTE: Creating Auth users via SQL is complex and requires specific Supabase schema access.
-- It is RECOMMENDED to create the admin user (Saneesh@intersmart.in) via the Super Admin UI 
-- now that the team "Team React" has been created by this migration.

-- If the user already exists in auth.users, you can link them manually:
/*
DO $$
DECLARE
    target_team_id UUID;
    target_user_id UUID;
BEGIN
    SELECT id INTO target_team_id FROM public.teams WHERE name = 'Team React';
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'Saneesh@intersmart.in';
    
    IF target_user_id IS NOT NULL AND target_team_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, email, team_id, role, full_name)
        VALUES (target_user_id, 'Saneesh@intersmart.in', target_team_id, 'admin', 'Saneesh')
        ON CONFLICT (id) DO UPDATE 
        SET team_id = target_team_id, role = 'admin';
    END IF;
END $$;
*/
