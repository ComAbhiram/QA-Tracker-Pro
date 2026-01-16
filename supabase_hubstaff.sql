
-- Table to store Hubstaff tokens persistently
CREATE TABLE IF NOT EXISTS public.hubstaff_tokens (
    id INT PRIMARY KEY DEFAULT 1,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial dummy row if not exists (application will update this)
INSERT INTO public.hubstaff_tokens (id, access_token, refresh_token, expires_at)
VALUES (1, '', '', 0)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.hubstaff_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated access (for backend usage with Anon Key)
-- Note: In a production environment with Service Role Key, this should be restricted.
-- However, since we are using Anon Key in API routes (as per src/lib/supabase.ts), we need this.
CREATE POLICY "Allow Public Access" ON public.hubstaff_tokens
FOR ALL
USING (true)
WITH CHECK (true);
