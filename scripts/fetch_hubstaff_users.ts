
import dotenv from 'dotenv';
import path from 'path';

// Load env FIRST for the auth lib to work
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    // Dynamic import to ensure env is loaded
    const { getValidAccessToken } = await import('../src/lib/hubstaff-auth');

    console.log('Fetching Hubstaff users...');
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
        console.error('Failed to get access token');
        return;
    }

    const orgId = process.env.HUBSTAFF_ORG_ID;
    const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

    console.log(`Fetching organization members for Org ID: ${orgId}...`);
    const response = await fetch(`${HUBSTAFF_API_BASE}/organizations/${orgId}/members?include=users`, {
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

    // Check if users are included in side-loading
    const users = data.users || []; // 'include=users' usually puts them here

    console.log('\n=== HUBSTAFF MEMBERS ===');

    if (users.length > 0) {
        users.forEach((u: any) => {
            console.log(`ID: ${u.id}, Name: "${u.name}"`);
        });
    } else {
        // Fallback to iterating members and trying to guess or fetch
        members.forEach((m: any) => {
            console.log(`Member ID: ${m.id}, User ID: ${m.user_id}, Name: "${m.name}"`);
        });
    }
}

main();
