-- Insert tasks for Frontend Developers team (Vishal@intersmart.in)
-- First, get the team_id for the frontend developers account

-- Task 1: Wasso Project Management / Wasso Strapi Website
INSERT INTO tasks (
    project_name, project_type, priority, sub_phase, pc, 
    assigned_to, assigned_to2, status, start_date, end_date,
    comments, current_updates, sprint_link, team_id
) VALUES (
    'Wasso Project Management / Wasso Strapi Website',
    'Next/strapi',
    NULL,
    NULL,
    'Bonies',
    'Ajay',
    'Josin',
    'In Progress',
    '2026-01-23',
    '2026-01-30',
    NULL,
    'Minimum 3 page should be done by next week',
    'https://docs.google.com/spreadsheets/d/1pxc6mlynqh_KFiVtjUnNqGbWE6ynJ-8b/edit',
    (SELECT team_id FROM user_profiles WHERE email = 'Vishal@intersmart.in')
);

-- Task 2: Dlife / Dlife
INSERT INTO tasks (
    project_name, project_type, priority, sub_phase, pc, 
    assigned_to, assigned_to2, status, start_date, end_date,
    comments, current_updates, deviation_reason, sprint_link, team_id
) VALUES (
    'Dlife / Dlife',
    NULL,
    NULL,
    'Addn Work',
    NULL,
    'Vishal',
    NULL,
    'Yet to Start',
    '2026-02-02',
    '2026-02-02',
    NULL,
    NULL,
    NULL,
    NULL,
    (SELECT team_id FROM user_profiles WHERE email = 'Vishal@intersmart.in')
);

-- Task 3: Rajagiri RCSS
INSERT INTO tasks (
    project_name, project_type, priority, sub_phase, pc, 
    assigned_to, assigned_to2, status, start_date, end_date,
    comments, current_updates, deviation_reason, sprint_link, team_id
) VALUES (
    'Rajagiri RCSS',
    NULL,
    NULL,
    NULL,
    NULL,
    'Josin',
    NULL,
    'Yet to Start',
    '2026-02-02',
    NULL,
    NULL,
    NULL,
    'effort/approval not received',
    NULL,
    (SELECT team_id FROM user_profiles WHERE email = 'Vishal@intersmart.in')
);

-- Task 4: DESQOO / DESQOO
INSERT INTO tasks (
    project_name, project_type, priority, sub_phase, pc, 
    assigned_to, assigned_to2, status, start_date, end_date,
    comments, current_updates, deviation_reason, sprint_link, team_id
) VALUES (
    'DESQOO / DESQOO',
    NULL,
    NULL,
    '(Additional work phase 3 – Arjun''s email 27th)',
    NULL,
    'Josin',
    NULL,
    'Forecast',
    NULL,
    NULL,
    NULL,
    NULL,
    'effort/review',
    NULL,
    (SELECT team_id FROM user_profiles WHERE email = 'Vishal@intersmart.in')
);

-- Task 5: KPI / KPI Static site (Audit)
INSERT INTO tasks (
    project_name, project_type, priority, sub_phase, pc, 
    assigned_to, assigned_to2, status, start_date, end_date,
    comments, current_updates, deviation_reason, sprint_link, team_id
) VALUES (
    'KPI / KPI Static site',
    NULL,
    '30 days from 28th Jan',
    'Audit (8 unique & 34 duplicate)',
    'Milda',
    'Vishnu Shaji',
    'Abish',
    'In Progress',
    '2026-01-30',
    '2026-03-12',
    NULL,
    'Complete before March last',
    NULL,
    'https://docs.google.com/spreadsheets/d/1QnS98wLBHX8t2gBpKRJBhgrw-byJEsGnl9JHZU_AQbQ/edit',
    (SELECT team_id FROM user_profiles WHERE email = 'Vishal@intersmart.in')
);

-- Task 6: KPI / KPI Static site (Vantheon)
INSERT INTO tasks (
    project_name, project_type, priority, sub_phase, pc, 
    assigned_to, assigned_to2, status, start_date, end_date,
    comments, current_updates, deviation_reason, sprint_link, team_id
) VALUES (
    'KPI / KPI Static site',
    NULL,
    NULL,
    '(Vantheon) (11 unique & 19 duplicate)',
    'Milda',
    'Vishnu Shaji',
    NULL,
    'Forecast',
    NULL,
    NULL,
    NULL,
    'Complete before March last',
    'prepare effort sheet (Design not provided)',
    NULL,
    (SELECT team_id FROM user_profiles WHERE email = 'Vishal@intersmart.in')
);
