-- Ensure Bindhu is in global_pcs with correct email
INSERT INTO public.global_pcs (name, email)
VALUES ('Bindhu', 'bindhu@intersmart.in')
ON CONFLICT (name) DO UPDATE SET email = 'bindhu@intersmart.in';

-- You can add other PCs here if needed
-- INSERT INTO public.global_pcs (name, email)
-- VALUES ('Arjun', 'arjun@intersmart.in')
-- ON CONFLICT (name) DO UPDATE SET email = 'arjun@intersmart.in';
