
-- 1. Create a sequence for IDs if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS tasks_id_seq;

-- 2. Set the default value of the `id` column to use the sequence
ALTER TABLE public.tasks 
ALTER COLUMN id SET DEFAULT nextval('tasks_id_seq');

-- 3. Update the sequence to start AFTER the current highest ID (so we don't duplicate)
-- We cast to BigInt to be safe
SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM public.tasks), 0) + 1);
