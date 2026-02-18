-- Add email column to global_pcs table
ALTER TABLE public.global_pcs 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the insert policy to ensure email can be added
-- (The existing policy "Super admins can insert PCs" already covers this as it allows all columns)

-- Optional: Add a check constraint for basic email validation
-- ALTER TABLE public.global_pcs ADD CONSTRAINT email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add UPDATE policy for super admins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'global_pcs' AND policyname = 'Super admins can update PCs'
    ) THEN
        CREATE POLICY "Super admins can update PCs" ON public.global_pcs
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE id = auth.uid() AND role = 'super_admin'
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE id = auth.uid() AND role = 'super_admin'
                )
            );
    END IF;
END
$$;
