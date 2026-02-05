-- Drop location column from project_overview table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_overview' AND column_name = 'location') THEN
        ALTER TABLE project_overview DROP COLUMN location;
    END IF;
END $$;
