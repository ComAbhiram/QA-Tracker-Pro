import { createBrowserClient } from '@supabase/ssr';

// Use environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create a browser client that uses cookies for session management
// We use a custom fetch to proxy requests while keeping the original URL 
// to ensure cookie names match what the server expects.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => {
      if (typeof window !== 'undefined' && url.toString().includes(supabaseUrl)) {
        const proxyUrl = url.toString().replace(supabaseUrl, `${window.location.origin}/supabase-proxy`);
        return fetch(proxyUrl, options);
      }
      return fetch(url, options);
    },
  },
  cookieOptions: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
