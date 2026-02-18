import { NextRequest, NextResponse } from 'next/server';
import { hubstaffClient } from '@/lib/hubstaff-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const forceRefresh = searchParams.get('refresh') === 'true';

        console.log(`[API] Fetching projects (forceRefresh: ${forceRefresh})...`);

        // Fetch full projects from client
        const projects = await hubstaffClient.getOrganizationProjects(forceRefresh);

        // Transform to simplified format expected by frontend
        const simplifiedProjects = projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            description: p.description
        }));

        // Sort by name
        simplifiedProjects.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return NextResponse.json({ projects: simplifiedProjects });

    } catch (error: any) {
        console.error('Error fetching Hubstaff projects:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch projects',
                message: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
