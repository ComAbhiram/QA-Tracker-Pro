
-- Add display_order column to team_members table
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update existing rows to have a default order (optional, effectively 0)
UPDATE public.team_members SET display_order = 0 WHERE display_order IS NULL;
