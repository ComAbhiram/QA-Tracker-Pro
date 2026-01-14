
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';
const HUBSTAFF_AUTH_BASE = 'https://account.hubstaff.com/access_tokens';

async function getAccessToken(refreshToken: string): Promise<string | null> {
    try {
        console.log('Exchanging refresh token...');
        const response = await fetch(HUBSTAFF_AUTH_BASE, {
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }).toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (!response.ok) {
            console.error('Token exchange failed:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error exchanging token:', error);
        return null;
    }
}

async function main() {
    const refreshToken = process.env.HUBSTAFF_REFRESH_TOKEN;
    const orgId = process.env.HUBSTAFF_ORG_ID;

    if (!refreshToken || !orgId) {
        console.error('Missing HUBSTAFF_REFRESH_TOKEN or HUBSTAFF_ORG_ID');
        return;
    }

    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return;

    console.log('Fetching organization members...');
    const response = await fetch(`${HUBSTAFF_API_BASE}/organizations/${orgId}/members`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        console.error('Failed to fetch members:', await response.text());
        return;
    }

    const data = await response.json();
    const members = data.members || [];

    console.log('\n=== HUBSTAFF MEMBERS ===');
    members.forEach((m: any) => {
        console.log(`ID: ${m.user_id}, Name: "${m.name}"`);
    });
}

main();
