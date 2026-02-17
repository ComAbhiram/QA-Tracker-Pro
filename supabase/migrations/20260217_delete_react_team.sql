-- Deletion Migration: Remove 'React' team and handle dependencies
-- Date: 2026-02-17

DO $$ 
DECLARE 
    react_team_id UUID;
BEGIN
    -- 1. Get the team ID for 'React'
    SELECT id INTO react_team_id FROM public.teams WHERE name = 'React';

    IF react_team_id IS NOT NULL THEN
        -- 2. Clear dependent records in user_profiles
        -- Set team_id to NULL to avoid deleting the actual users
        UPDATE public.user_profiles 
        SET team_id = NULL 
        WHERE team_id = react_team_id;

        -- 3. Clear dependent records in projects
        -- Now that projects are global, we set team_id to NULL
        UPDATE public.projects 
        SET team_id = NULL 
        WHERE team_id = react_team_id;

        -- 4. Delete dependent records in team_members
        DELETE FROM public.team_members 
        WHERE team_id = react_team_id;

        -- 5. Delete dependent records in leaves
        DELETE FROM public.leaves 
        WHERE team_id = react_team_id;

        -- 6. Delete dependent records in sub_phases
        DELETE FROM public.sub_phases 
        WHERE team_id = react_team_id;

        -- 7. Finally, delete the team
        DELETE FROM public.teams 
        WHERE id = react_team_id;

        RAISE NOTICE 'Team React (%) and its dependencies have been processed.', react_team_id;
    ELSE
        RAISE NOTICE 'Team React not found.';
    END IF;
END $$;
