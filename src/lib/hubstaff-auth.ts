import fs from 'fs/promises';
import path from 'path';

const TOKEN_FILE_PATH = path.join(process.cwd(), '.hubstaff_tokens.json');
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
        await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save tokens to file:', error);
    }
}

async function loadTokens(): Promise<TokenData | null> {
    if (memoryTokenCache) return memoryTokenCache;

    try {
        const fileContent = await fs.readFile(TOKEN_FILE_PATH, 'utf-8');
        const data = JSON.parse(fileContent);
        memoryTokenCache = data;
        return data;
    } catch (error) {
        // File doesn't exist or is invalid, fall back to null
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
            // 1. The one from our cache (most recent)
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
