-- Check current state of leaves and their team assignments
-- This will help us understand what's wrong

SELECT 
    l.team_member_name,
    l.team_id as leave_team_id,
    t_leave.name as leave_team_name,
    up.team_id as profile_team_id,
    t_profile.name as profile_team_name,
    CASE 
        WHEN l.team_id::text = up.team_id::text THEN '✓ CORRECT'
        WHEN l.team_id IS NOT NULL AND up.team_id IS NOT NULL AND l.team_id::text != up.team_id::text THEN '✗ WRONG'
        WHEN l.team_id IS NULL THEN '⚠ NULL'
        ELSE '? NO PROFILE'
    END as status
FROM leaves l
LEFT JOIN user_profiles up ON l.team_member_id::text = up.id::text
LEFT JOIN teams t_leave ON l.team_id = t_leave.id
LEFT JOIN teams t_profile ON up.team_id = t_profile.id
WHERE l.team_member_name IN ('Samir Mulashiya', 'Jostin Joseph', 'Sreegith VA', 'Aswathi M Ashok', 'Abhiram')
ORDER BY l.team_member_name, l.leave_date DESC
LIMIT 50;
