-- Consolidation Migration: Merge project_overview into projects table
-- Date: 2026-02-17

-- 1. Add all missing columns from project_overview to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS pc TEXT,
ADD COLUMN IF NOT EXISTS allotted_time_days DECIMAL,
ADD COLUMN IF NOT EXISTS tl_confirmed_effort_days DECIMAL,
ADD COLUMN IF NOT EXISTS blockers TEXT,
ADD COLUMN IF NOT EXISTS expected_effort_days DECIMAL,
ADD COLUMN IF NOT EXISTS hubstaff_budget TEXT,
ADD COLUMN IF NOT EXISTS committed_days DECIMAL,
ADD COLUMN IF NOT EXISTS fixing_text TEXT,
ADD COLUMN IF NOT EXISTS live_text TEXT,
ADD COLUMN IF NOT EXISTS budget_text TEXT,
ADD COLUMN IF NOT EXISTS started_date DATE,
ADD COLUMN IF NOT EXISTS project_type TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Migrate existing data from project_overview to projects where possible
-- We match by name and team_id. If a project exists in project_overview but not in projects, 
-- we should technically have it in projects already if it was "imported", 
-- but manual ones might only be in one place if logic was broken.

UPDATE public.projects p
SET 
    pc = po.pc,
    allotted_time_days = po.allotted_time_days,
    tl_confirmed_effort_days = po.tl_confirmed_effort_days,
    blockers = po.blockers,
    expected_effort_days = po.expected_effort_days,
    hubstaff_budget = po.hubstaff_budget,
    committed_days = po.committed_days,
    fixing_text = po.fixing_text,
    live_text = po.live_text,
    budget_text = po.budget_text,
    started_date = po.started_date,
    project_type = po.project_type,
    category = po.category,
    created_by = po.created_by,
    updated_at = po.updated_at
FROM public.project_overview po
WHERE p.name = po.project_name 
AND (p.team_id = po.team_id OR (p.team_id IS NULL AND po.team_id IS NOT NULL));

-- 3. Any projects in project_overview that are NOT in projects? 
-- (Shouldn't happen with the trigger, but let's be safe)
INSERT INTO public.projects (
    name, team_id, pc, allotted_time_days, 
    tl_confirmed_effort_days, blockers, expected_effort_days, 
    hubstaff_budget, committed_days, fixing_text, live_text, 
    budget_text, started_date, project_type, category, 
    created_by, updated_at, status
)
SELECT 
    project_name, team_id, pc, allotted_time_days, 
    tl_confirmed_effort_days, blockers, expected_effort_days, 
    hubstaff_budget, committed_days, fixing_text, live_text, 
    budget_text, started_date, project_type, category, 
    created_by, updated_at, 'active'
FROM public.project_overview po
WHERE NOT EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.name = po.project_name 
    AND (p.team_id = po.team_id OR (p.team_id IS NULL AND po.team_id IS NOT NULL))
);

-- 4. Clean up any data in project_overview
TRUNCATE TABLE public.project_overview CASCADE;

-- 5. IMPORTANT: We are NOT dropping the table yet until the code is updated and verified.
-- But we will disable triggers if they interfere.
-- ALTER TABLE public.projects DISABLE TRIGGER ALL; -- Optional safety
