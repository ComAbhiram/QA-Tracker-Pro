import { createBrowserClient } from '@supabase/ssr';

const isBrowser = typeof window !== 'undefined';
// Use the Next.js rewrite proxy for browser requests to bypass network restrictions
const supabaseUrl = isBrowser ? `${window.location.origin}/supabase-proxy` : (process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create a browser client that uses cookies for session management
// This is required for the middleware to be able to read the session
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
