-- Count total projects in database
SELECT COUNT(*) as total_projects FROM projects;

-- Count by status (case-sensitive)
SELECT 
    status,
    COUNT(*) as count
FROM projects
GROUP BY status
ORDER BY count DESC;

-- Count how many projects the API should return (no filters)
SELECT COUNT(*) as should_return FROM projects;

-- Check if there are any NULL statuses
SELECT COUNT(*) as null_status_count 
FROM projects 
WHERE status IS NULL;
