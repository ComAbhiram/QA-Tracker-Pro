import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/hubstaff-auth';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

export async function GET(request: NextRequest) {
    try {
        const orgId = process.env.HUBSTAFF_ORG_ID;
        // Use shared auth logic which handles DB storage and refreshing
        const accessToken = await getValidAccessToken();

        if (!orgId || !accessToken) {
            return NextResponse.json(
                { error: 'HUBSTAFF_ORG_ID or HUBSTAFF_ACCESS_TOKEN not configured or expired' },
                { status: 500 }
            );
        }

        console.log(`Fetching active projects for org: ${orgId}`);

        let allProjects: any[] = [];
        let pageStartId: any = undefined;
        let hasMore = true;
        let pageCount = 0;

        // Fetch all pages
        while (hasMore) {
            pageCount++;
            let url = `${HUBSTAFF_API_BASE}/organizations/${orgId}/projects?status=active`;
            if (pageStartId) {
                url += `&page_start_id=${pageStartId}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Hubstaff API error (Page ${pageCount}):`, response.status, errorText);

                // If we have some projects, return what we have? Or fail?
                // For now, if we have pages, let's break and return partial
                if (allProjects.length > 0) {
                    break;
                }

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
            allProjects = [...allProjects, ...projects];

            if (data.pagination && data.pagination.next_page_start_id) {
                pageStartId = data.pagination.next_page_start_id;
            } else {
                hasMore = false;
            }
        }

        console.log(`Fetched total ${allProjects.length} active projects from Hubstaff.`);

        // Transform to simplified format
        const simplifiedProjects = allProjects.map((p: any) => ({
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
