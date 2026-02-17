import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getValidAccessToken } from '@/lib/hubstaff-auth';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

// Cache for team members
let cachedMembers: any[] | null = null;
let membersExpiry: number = 0;

export async function GET(request: NextRequest) {
    const orgId = process.env.HUBSTAFF_ORG_ID;
    const accessToken = await getValidAccessToken();

    if (!orgId || !accessToken) {
        return NextResponse.json(
            { error: 'Hubstaff credentials not configured or valid' },
            { status: 500 }
        );
    }

    try {
        console.log(`Fetching team members for org: ${orgId}`);

        // Fetch organization members from Hubstaff API
        const response = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/members`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Hubstaff API error:', response.status, errorText);
            return NextResponse.json(
                { error: 'Failed to fetch team members from Hubstaff' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract member user IDs from organization memberships
        const membersList = data.organization_memberships || data.users || data.members || [];
        console.log(`Found ${membersList.length} organization memberships`);

        // Fetch user details for each member
        // OPTIMIZATION: Check if 'user' object is already present in membership to avoid N+1 requests
        const members = await Promise.all(
            membersList.map(async (member: any) => {
                const userId = member.user_id || member.id;
                let name = member.name; // Sometimes directly on member

                // If member has user object with name, use it
                if (member.user && member.user.name) {
                    return {
                        id: userId,
                        name: member.user.name
                    };
                }

                // If name is missing, TRY to fetch (but limit this strictly)
                // Only fetch if we really don't have a name
                try {
                    console.log(`Fetching details for user ${userId} (missing in list)...`);
                    const userResponse = await fetch(
                        `${HUBSTAFF_API_BASE}/users/${userId}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        const user = userData.user || userData;
                        name = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                    }
                } catch (error) {
                    console.error(`Error fetching user ${userId}:`, error);
                }

                return {
                    id: userId,
                    name: name || `User ${userId}`,
                };
            })
        );

        // Cache the results for 1 hour
        cachedMembers = members;
        membersExpiry = Date.now() + 3600000; // 1 hour

        console.log(`Successfully fetched ${members.length} team members with names`);
        console.log('Sample members:', members.slice(0, 3));

        return NextResponse.json({ members });
    } catch (error) {
        console.error('Error fetching team members:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
