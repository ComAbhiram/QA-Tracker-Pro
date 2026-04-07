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
    fetch: async (url, options) => {
      if (typeof window !== 'undefined' && url.toString().includes(supabaseUrl)) {
        const proxyUrl = url.toString().replace(supabaseUrl, `${window.location.origin}/supabase-proxy`);
        try {
          const response = await fetch(proxyUrl, options);
          if (!response.ok && response.status >= 500) {
            console.error(`Supabase Proxy Error: ${response.status} ${response.statusText}`);
          }
          return response;
        } catch (error) {
          console.error('Supabase Proxy Connection Error:', error);
          throw error;
        }
      }
      return fetch(url, options);
    },
  },
  cookieOptions: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
