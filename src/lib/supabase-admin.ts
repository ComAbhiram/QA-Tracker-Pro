import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Note: Ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local
if (!supabaseUrl || !supabaseServiceRoleKey) {
    // We log a warning instead of throwing to avoid crashing the build if envs are missing during build time
    console.warn('Missing Supabase URL or Service Role Key in environment variables');
}

// SAFE INITIALIZATION: Pass a dummy key if missing to prevent crash on import.
// Operations using this client will fail if the key is invalid, but the app won't crash on startup.
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceRoleKey || 'placeholder-key', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
