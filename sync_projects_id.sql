
-- Sync the internal ID counter for Projects
-- This makes sure the next ID generated is higher than any existing ID
SELECT setval(
    pg_get_serial_sequence('public.projects', 'id'), 
    COALESCE((SELECT MAX(id) FROM public.projects), 0)
);
