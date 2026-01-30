import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/hubstaff-auth';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

export async function GET() {
    try {
        const orgId = process.env.HUBSTAFF_ORG_ID;
        const accessToken = await getValidAccessToken();

        console.log('[API] Fetching members for Org:', orgId, 'Active Token:', !!accessToken);

        if (!orgId || !accessToken) {
            return NextResponse.json(
                { error: 'HUBSTAFF_ORG_ID or HUBSTAFF_ACCESS_TOKEN not configured or expired' },
                { status: 500 }
            );
        }

        // Fetch organization members
        const response = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/members?include=users`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error fetching Hubstaff members:', errorText);
            console.error('Status:', response.status);
            console.error('Org ID:', orgId);
            throw new Error(`Hubstaff API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const members = data.members || [];
        const users = data.users || [];

        // Create a lookup map for users
        const userMap = new Map(users.map((u: any) => [u.id, u]));

        // Map to a clean format: { id, name }
        const formattedMembers = members.map((m: any) => {
            // Find the user details using user_id from member record
            const userId = m.user_id || m.id;
            const user = userMap.get(userId);

            // Prefer user.name, fallback to m.name or "Unknown"
            const name = (user ? user.name : m.name) || 'Unknown Member';

            return {
                id: userId,
                name
            };
        })
            .filter((m: any) => m.name !== 'Unknown Member')
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        return NextResponse.json({ members: formattedMembers });

    } catch (error: any) {
        console.error('Error in /api/hubstaff/members:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch Hubstaff members' },
            { status: 500 }
        );
    }
}
