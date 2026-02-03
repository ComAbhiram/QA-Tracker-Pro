-- Auto-sync projects to project_overview
-- This ensures projects created in "Manage Projects" automatically appear in "Project Overview"

-- Function to sync project to project_overview
CREATE OR REPLACE FUNCTION sync_project_to_overview()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new project is created, automatically create a project_overview entry
    IF TG_OP = 'INSERT' THEN
        INSERT INTO project_overview (
            project_name,
            team_id,
            location,
            pc,
            allotted_time_days,
            tl_confirmed_effort_days,
            blockers
        ) VALUES (
            NEW.name,
            NEW.team_id,
            NULL,  -- Default location, can be updated later
            NULL,  -- Default PC, can be updated later
            NULL,  -- Default allotted time
            NULL,  -- Default TL effort
            NULL   -- Default blockers
        )
        ON CONFLICT (project_name, team_id) DO NOTHING;  -- Avoid duplicates
        
    -- When a project is updated, update the project_overview entry
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE project_overview
        SET 
            project_name = NEW.name,
            updated_at = NOW()
        WHERE project_name = OLD.name AND team_id = NEW.team_id;
        
    -- When a project is deleted, optionally delete from project_overview
    -- (Comment out if you want to keep overview data even after project deletion)
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM project_overview
        WHERE project_name = OLD.name AND team_id = OLD.team_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on projects table
DROP TRIGGER IF EXISTS sync_project_to_overview_trigger ON projects;
CREATE TRIGGER sync_project_to_overview_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION sync_project_to_overview();

-- Backfill existing projects into project_overview
INSERT INTO project_overview (project_name, team_id, location, pc, allotted_time_days, tl_confirmed_effort_days, blockers)
SELECT 
    p.name,
    p.team_id,
    NULL as location,
    NULL as pc,
    NULL as allotted_time_days,
    NULL as tl_confirmed_effort_days,
    NULL as blockers
FROM projects p
ON CONFLICT (project_name, team_id) DO NOTHING;

-- Add helpful comment
COMMENT ON TRIGGER sync_project_to_overview_trigger ON projects IS 
'Automatically syncs projects to project_overview table when created, updated, or deleted';
