-- Check which team_id the leaves belong to
SELECT 
    l.team_member_name,
    l.leave_type,
    l.leave_date,
    l.team_id,
    t.name as team_name
FROM leaves l
LEFT JOIN teams t ON l.team_id = t.id
WHERE l.team_member_name IN ('Vishal Ramesh', 'Sreegith VA', 'Aswathi M Ashok', 'Abhiram')
ORDER BY l.leave_date DESC
LIMIT 20;
