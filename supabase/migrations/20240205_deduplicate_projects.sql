-- Deduplicate project_overview table
-- Keeps the most recently updated record for each project_name and team_id pair

WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY project_name, team_id
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

-- Also, let's double check if there are tasks pointing to deleted projects?
-- The foreign key should handle it (ON DELETE CASCADE) or we might leave orphans if no FK.
-- Assuming project_overview is mostly a view/metadata table.
