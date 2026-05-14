-- Create a view to aggregate task statistics by project
CREATE OR REPLACE VIEW project_task_stats AS
SELECT
    project_name,
    -- Aggregated Resources: Combine assigned_to, assigned_to2, and unnest additional_assignees
    ARRAY_AGG(DISTINCT assignee) FILTER (WHERE assignee IS NOT NULL AND assignee != '') AS resources,
    -- Sum of Activity Percentage
    COALESCE(SUM(activity_percentage), 0) AS total_activity_percentage,
    -- Sum of Time Taken (converted to days: 8 hours = 1 day)
    -- specific casting might be needed depending on how time_taken is stored (text 'HH:MM:SS' or interval)
    -- Assuming text 'HH:MM:SS', we need to convert to interval then epoch
    COALESCE(
        SUM(
            EXTRACT(EPOCH FROM 
                CASE 
                    WHEN time_taken IS NULL OR time_taken = '' THEN '00:00:00'::interval 
                    ELSE time_taken::interval 
                END
            )
        ) / 3600.0 / 8.0, 
        0
    ) AS total_time_taken_days,
    -- Sum of Days Allotted
    COALESCE(SUM(days_allotted), 0) AS total_allotted_days,
    -- Count of tasks
    COUNT(*) AS task_count
FROM (
    SELECT id, project_name, assigned_to AS assignee, activity_percentage, time_taken, days_allotted FROM tasks
    UNION ALL
    SELECT id, project_name, assigned_to2 AS assignee, activity_percentage, time_taken, days_allotted FROM tasks
    UNION ALL
    SELECT t.id, t.project_name, unnested_assignee AS assignee, t.activity_percentage, t.time_taken, t.days_allotted
    FROM tasks t, UNNEST(t.additional_assignees) AS unnested_assignee
) AS all_assignees
GROUP BY project_name;

-- Grant access to authenticated users
GRANT SELECT ON project_task_stats TO authenticated;
GRANT SELECT ON project_task_stats TO service_role;
