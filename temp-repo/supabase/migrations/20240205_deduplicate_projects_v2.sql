-- Enhanced deduplication script
-- 1. Cleans up duplicates handling whitespace differences
-- 2. Adds a unique constraint to prevent future duplicates

-- Step 1: Remove duplicates (keep most recent)
WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY TRIM(LOWER(project_name)), team_id
            ORDER BY updated_at DESC, created_at DESC
        ) as row_num
    FROM
        project_overview
)
DELETE FROM
    project_overview
WHERE
    id IN (
        SELECT id
        FROM duplicates
        WHERE row_num > 1
    );

-- Step 2: Add Unique Index to prevent future duplicates
-- We use a unique index on the expression TRIM(LOWER(project_name)) to ensure case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_name_team_idx 
ON project_overview (TRIM(LOWER(project_name)), team_id);
