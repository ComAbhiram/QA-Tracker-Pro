-- Add composite unique constraint to prevent duplicate imports by same team
-- This allows different teams to import the same Hubstaff project, but prevents
-- the same team from accidentally importing the same project multiple times

-- Step 1: Clean up existing duplicates
-- For each (hubstaff_id, team_id) combination, keep only the oldest record
DO $$
DECLARE
    duplicate_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting duplicate cleanup...';
    
    -- Find and delete duplicate projects (same hubstaff_id + team_id)
    FOR duplicate_record IN
        SELECT hubstaff_id, team_id, MIN(id) as keep_id
        FROM projects
        WHERE hubstaff_id IS NOT NULL
        GROUP BY hubstaff_id, team_id
        HAVING COUNT(*) > 1
    LOOP
        -- Delete all except the one we want to keep
        DELETE FROM projects
        WHERE hubstaff_id = duplicate_record.hubstaff_id
          AND team_id = duplicate_record.team_id
          AND id != duplicate_record.keep_id;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % duplicate(s) for hubstaff_id=%, team_id=%', 
            deleted_count, duplicate_record.hubstaff_id, duplicate_record.team_id;
    END LOOP;
    
    RAISE NOTICE 'Duplicate cleanup complete!';
END $$;

-- Step 2: Add unique constraint
-- This prevents future duplicates from being created
ALTER TABLE projects
ADD CONSTRAINT projects_hubstaff_team_unique 
UNIQUE (hubstaff_id, team_id);

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_hubstaff_team 
ON projects(hubstaff_id, team_id) 
WHERE hubstaff_id IS NOT NULL;
