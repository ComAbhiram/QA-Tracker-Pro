
-- 1. Create a sequence for Projects IDs if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS projects_id_seq;

-- 2. Set the default value of the `id` column to use the sequence
ALTER TABLE public.projects 
ALTER COLUMN id SET DEFAULT nextval('projects_id_seq');

-- 3. Update the sequence to start AFTER the current highest ID (so we don't duplicate)
SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM public.projects), 0) + 1);
