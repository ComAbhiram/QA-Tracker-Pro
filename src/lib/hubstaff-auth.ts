import { supabase } from '@/lib/supabase';

const HUBSTAFF_AUTH_BASE = 'https://account.hubstaff.com/access_tokens';

interface TokenData {
    access_token: string;
    refresh_token: string;
    expires_at: number; // Timestamp in milliseconds
}

// In-memory cache as first layer
let memoryTokenCache: TokenData | null = null;
let refreshPromise: Promise<string | null> | null = null;

async function saveTokens(data: TokenData) {
    memoryTokenCache = data;
    try {
        const { error } = await supabase
            .from('hubstaff_tokens')
            .upsert({
                id: 1,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: data.expires_at,
                updated_at: new Date().toISOString()
            });

        if (error) console.error('Failed to save tokens to Supabase:', error);
    } catch (error) {
        console.error('Failed to save tokens:', error);
    }
}

async function loadTokens(): Promise<TokenData | null> {
    if (memoryTokenCache) return memoryTokenCache;

    try {
        const { data, error } = await supabase
            .from('hubstaff_tokens')
            .select('*')
            .eq('id', 1)
            .single();

        if (error || !data) return null;

        const tokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Number(data.expires_at)
        };
        memoryTokenCache = tokens;
        return tokens;
    } catch (error) {
        console.error('Error loading tokens:', error);
        return null;
    }
}

export async function getValidAccessToken(): Promise<string | null> {
    // 1. Check caches
    const cached = await loadTokens();

    // If we have a valid token with buffer (5 minutes), return it
    if (cached && cached.expires_at > Date.now() + 300000) {
        return cached.access_token;
    }

    // 2. If no valid token, we need to refresh
    // Prevent multiple parallel refreshes using a promise lock
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            // Determine which refresh token to use:
            // 1. The one from our DB (most recent)
            // 2. The one from env (fallback for initial setup)
            const refreshTokenToUse = cached?.refresh_token || process.env.HUBSTAFF_REFRESH_TOKEN;

            if (!refreshTokenToUse) {
                console.error('No refresh token available');
                return null;
            }

            console.log('Refreshing Hubstaff access token...');
            const response = await fetch(HUBSTAFF_AUTH_BASE, {
                method: 'POST',
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshTokenToUse,
                }).toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Token refresh failed:', response.status, errorText);
                return null;
            }

            const data = await response.json();
            const expiresIn = data.expires_in || 3600;
            const newTokens: TokenData = {
                access_token: data.access_token,
                refresh_token: data.refresh_token, // Capture new refresh token!
                expires_at: Date.now() + (expiresIn * 1000),
            };

            await saveTokens(newTokens);
            console.log('Successfully refreshed Hubstaff token');
            return newTokens.access_token;

        } catch (error) {
            console.error('Error in getValidAccessToken:', error);
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}
