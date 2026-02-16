-- Fix project import error by replacing the faulty trigger
-- The error "column location does not exist" suggests an old trigger is trying to insert into the dropped column.

-- 1. Create a safe function to create project overview (without location)
CREATE OR REPLACE FUNCTION handle_new_project_safe()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO project_overview (
        project_name,
        team_id,
        created_at,
        updated_at
    ) VALUES (
        NEW.name,
        NEW.team_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (project_name, team_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop ALL existing INSERT triggers on 'projects' to clean up the broken one
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'projects'
        AND event_manipulation = 'INSERT'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(t_name) || ' ON projects';
    END LOOP;
END $$;

-- 3. Create the new correct trigger
CREATE TRIGGER on_project_created_safe
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION handle_new_project_safe();
