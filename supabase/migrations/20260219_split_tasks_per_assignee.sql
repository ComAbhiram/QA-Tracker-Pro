-- Migration to split tasks with multiple assignees into separate rows

-- 1. Handle `assigned_to2`
-- Insert new tasks for `assigned_to2`
INSERT INTO tasks (
    project_name, project_type, priority, sub_phase, status,
    assigned_to, -- Set new assignee
    assigned_to2, -- Clear secondary
    additional_assignees, -- Clear additional
    pc, start_date, end_date, actual_completion_date,
    start_time, end_time,
    bug_count, html_bugs, functional_bugs, deviation_reason,
    sprint_link, days_allotted, time_taken, days_taken, deviation,
    activity_percentage, comments, current_updates,
    include_saturday, include_sunday, team_id, created_at, updated_at
)
SELECT
    project_name, project_type, priority, sub_phase, status,
    assigned_to2, -- Move assigned_to2 to assigned_to
    NULL, -- Clear
    NULL, -- Clear
    pc, start_date, end_date, actual_completion_date,
    start_time, end_time,
    bug_count, html_bugs, functional_bugs, deviation_reason,
    sprint_link, days_allotted, time_taken, days_taken, deviation,
    activity_percentage, comments, current_updates,
    include_saturday, include_sunday, team_id, created_at, updated_at
FROM tasks
WHERE assigned_to2 IS NOT NULL AND assigned_to2 != '';

-- 2. Handle `additional_assignees`
-- We need to unnest the array and insert a row for each
INSERT INTO tasks (
    project_name, project_type, priority, sub_phase, status,
    assigned_to, -- Set new assignee
    assigned_to2, -- Clear secondary
    additional_assignees, -- Clear additional
    pc, start_date, end_date, actual_completion_date,
    start_time, end_time,
    bug_count, html_bugs, functional_bugs, deviation_reason,
    sprint_link, days_allotted, time_taken, days_taken, deviation,
    activity_percentage, comments, current_updates,
    include_saturday, include_sunday, team_id, created_at, updated_at
)
SELECT
    t.project_name, t.project_type, t.priority, t.sub_phase, t.status,
    unnested_assignee, -- The unnested assignee
    NULL,
    NULL,
    t.pc, t.start_date, t.end_date, t.actual_completion_date,
    t.start_time, t.end_time,
    t.bug_count, t.html_bugs, t.functional_bugs, t.deviation_reason,
    t.sprint_link, t.days_allotted, t.time_taken, t.days_taken, t.deviation,
    t.activity_percentage, t.comments, t.current_updates,
    t.include_saturday, t.include_sunday, t.team_id, t.created_at, t.updated_at
FROM tasks t,
LATERAL unnest(t.additional_assignees) AS unnested_assignee
WHERE t.additional_assignees IS NOT NULL AND array_length(t.additional_assignees, 1) > 0;

-- 3. Cleanup original rows
-- Now that we've copied them, clear the secondary fields on the original rows
UPDATE tasks
SET assigned_to2 = NULL, additional_assignees = NULL
WHERE (assigned_to2 IS NOT NULL AND assigned_to2 != '')
   OR (additional_assignees IS NOT NULL AND array_length(additional_assignees, 1) > 0);
