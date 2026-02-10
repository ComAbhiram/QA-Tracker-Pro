-- Change team_member_id to TEXT to support Hubstaff IDs
DO $$ 
BEGIN
    -- Drop foreign key if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leaves_team_member_id_fkey') THEN
        ALTER TABLE leaves DROP CONSTRAINT leaves_team_member_id_fkey;
    END IF;

    -- Change column type
    ALTER TABLE leaves ALTER COLUMN team_member_id TYPE TEXT;
END $$;
