import { NextRequest, NextResponse } from 'next/server';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';
const HUBSTAFF_AUTH_BASE = 'https://account.hubstaff.com/access_tokens';

// Cache for access tokens (shared with other Hubstaff APIs)
// In a serverless environment, this might reset, but useful for hot containers
let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(refreshToken: string): Promise<string | null> {
    // Return cached token if still valid
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    try {
        console.log('Exchanging refresh token for access token...');
        const response = await fetch(HUBSTAFF_AUTH_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }).toString(),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token exchange error:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        cachedAccessToken = data.access_token;

        // Set expiry to 5 minutes before actual expiry for safety
        const expiresIn = data.expires_in || 3600;
        tokenExpiry = Date.now() + (expiresIn - 300) * 1000;

        console.log('Successfully obtained access token');
        return cachedAccessToken;
    } catch (error) {
        console.error('Error exchanging token:', error);
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const orgId = process.env.HUBSTAFF_ORG_ID;
        const refreshToken = process.env.HUBSTAFF_REFRESH_TOKEN;
        let accessToken = process.env.HUBSTAFF_ACCESS_TOKEN;

        if (refreshToken) {
            const refreshedToken = await getAccessToken(refreshToken);
            if (refreshedToken) {
                accessToken = refreshedToken;
            }
        }

        if (!orgId || !accessToken) {
            return NextResponse.json(
                { error: 'HUBSTAFF_ORG_ID or HUBSTAFF_ACCESS_TOKEN not configured' },
                { status: 500 }
            );
        }

        console.log(`Fetching active projects for org: ${orgId}`);

        // Fetch active projects
        const response = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/projects?status=active`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Hubstaff API error:', response.status, errorText);
            return NextResponse.json(
                {
                    error: 'Failed to fetch projects from Hubstaff',
                    status: response.status,
                    details: errorText
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        const projects = data.projects || [];

        // Transform to simplified format
        const simplifiedProjects = projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            description: p.description
        }));

        // Sort by name
        simplifiedProjects.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return NextResponse.json({ projects: simplifiedProjects });

    } catch (error) {
        console.error('Error fetching Hubstaff projects:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch projects',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
