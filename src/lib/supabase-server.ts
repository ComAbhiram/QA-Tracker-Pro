import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (bypasses RLS)
// Using lazy initialization to avoid build-time errors when env vars aren't available
let _supabaseServer: SupabaseClient | null = null;

function getSupabaseServer(): SupabaseClient {
    if (_supabaseServer) {
        return _supabaseServer;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables for server client');
    }

    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    return _supabaseServer;
}

// Export as a getter to ensure lazy initialization
export const supabaseServer = new Proxy({} as SupabaseClient, {
    get: (target, prop) => {
        const client = getSupabaseServer();
        return (client as any)[prop];
    }
});
