-- Add email column to global_pcs table
ALTER TABLE public.global_pcs 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the insert policy to ensure email can be added
-- (The existing policy "Super admins can insert PCs" already covers this as it allows all columns)

-- Optional: Add a check constraint for basic email validation
-- ALTER TABLE public.global_pcs ADD CONSTRAINT email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
