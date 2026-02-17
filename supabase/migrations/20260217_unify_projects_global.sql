-- Migration to unify project records globally and prevent duplication
-- This script merges duplicates by name or Hubstaff ID and updates constraints.

DO $$
DECLARE
    main_record RECORD;
    dup_record RECORD;
    merged_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting global project unification...';

    -- 1. Merge duplicates based on Hubstaff ID (Grouped by Hubstaff ID)
    FOR main_record IN 
        SELECT hubstaff_id, MIN(id) as survivor_id
        FROM projects
        WHERE hubstaff_id IS NOT NULL
        GROUP BY hubstaff_id
        HAVING COUNT(*) > 1
    LOOP
        FOR dup_record IN 
            SELECT id FROM projects 
            WHERE hubstaff_id = main_record.hubstaff_id 
            AND id != main_record.survivor_id
        LOOP
            -- Inherit metadata from duplicate if survivor is missing it
            UPDATE projects p
            SET 
                pc = COALESCE(p.pc, d.pc),
                allotted_time_days = COALESCE(p.allotted_time_days, d.allotted_time_days),
                tl_confirmed_effort_days = COALESCE(p.tl_confirmed_effort_days, d.tl_confirmed_effort_days),
                blockers = COALESCE(p.blockers, d.blockers),
                expected_effort_days = COALESCE(p.expected_effort_days, d.expected_effort_days),
                hubstaff_budget = COALESCE(p.hubstaff_budget, d.hubstaff_budget),
                committed_days = COALESCE(p.committed_days, d.committed_days),
                fixing_text = COALESCE(p.fixing_text, d.fixing_text),
                live_text = COALESCE(p.live_text, d.live_text),
                budget_text = COALESCE(p.budget_text, d.budget_text),
                started_date = COALESCE(p.started_date, d.started_date),
                project_type = COALESCE(p.project_type, d.project_type),
                category = COALESCE(p.category, d.category)
            FROM projects d
            WHERE p.id = main_record.survivor_id AND d.id = dup_record.id;

            -- Delete the duplicate
            DELETE FROM projects WHERE id = dup_record.id;
            merged_count := merged_count + 1;
        END LOOP;
    END LOOP;

    -- 2. Merge duplicates based on Project Name (for those without hubstaff_id)
    -- Grouping by name (case-insensitive and trimmed)
    FOR main_record IN 
        SELECT LOWER(TRIM(name)) as clean_name, MIN(id) as survivor_id
        FROM projects
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
    LOOP
        FOR dup_record IN 
            SELECT id FROM projects 
            WHERE LOWER(TRIM(name)) = main_record.clean_name 
            AND id != main_record.survivor_id
        LOOP
            -- Inherit metadata
            UPDATE projects p
            SET 
                pc = COALESCE(p.pc, d.pc),
                allotted_time_days = COALESCE(p.allotted_time_days, d.allotted_time_days),
                tl_confirmed_effort_days = COALESCE(p.tl_confirmed_effort_days, d.tl_confirmed_effort_days),
                blockers = COALESCE(p.blockers, d.blockers),
                expected_effort_days = COALESCE(p.expected_effort_days, d.expected_effort_days),
                hubstaff_budget = COALESCE(p.hubstaff_budget, d.hubstaff_budget),
                committed_days = COALESCE(p.committed_days, d.committed_days),
                fixing_text = COALESCE(p.fixing_text, d.fixing_text),
                live_text = COALESCE(p.live_text, d.live_text),
                budget_text = COALESCE(p.budget_text, d.budget_text),
                started_date = COALESCE(p.started_date, d.started_date),
                project_type = COALESCE(p.project_type, d.project_type),
                category = COALESCE(p.category, d.category),
                hubstaff_id = COALESCE(p.hubstaff_id, d.hubstaff_id) -- Take Hubstaff ID if duplicate has it
            FROM projects d
            WHERE p.id = main_record.survivor_id AND d.id = dup_record.id;

            -- Delete the duplicate
            DELETE FROM projects WHERE id = dup_record.id;
            merged_count := merged_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Merged % duplicate project records.', merged_count;

    -- 3. Set all unified projects to be "Global" (team_id = NULL)
    -- This makes them visible to all teams by default in the API
    UPDATE projects SET team_id = NULL;
    RAISE NOTICE 'All projects set to global status (team_id = NULL).';

    -- 4. Update constraints for global uniqueness
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_hubstaff_team_unique;
    
    -- Drop existing uniqueness index if it exists
    DROP INDEX IF EXISTS idx_projects_hubstaff_team;

    -- New Global Constraint: Hubstaff ID must be unique across ALL teams
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_hubstaff_id_key;
    ALTER TABLE projects ADD CONSTRAINT projects_hubstaff_id_key UNIQUE (hubstaff_id) WHERE hubstaff_id IS NOT NULL;

    -- New Global Constraint: Project Name must be unique (trimmed and lowercased)
    -- We'll use a unique index for this as Postgres doesn't allow expressions in UNIQUE constraints easily
    DROP INDEX IF EXISTS idx_projects_unique_name;
    CREATE UNIQUE INDEX idx_projects_unique_name ON projects (LOWER(TRIM(name)));

END $$;
