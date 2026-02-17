import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getValidAccessToken } from '@/lib/hubstaff-auth';
import { determineUserTeam } from '@/lib/hubstaff-team-mapping';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

export async function GET(request: NextRequest) {
    try {
        const orgId = process.env.HUBSTAFF_ORG_ID;
        const accessToken = await getValidAccessToken();

        if (!orgId || !accessToken) {
            return NextResponse.json(
                { error: 'Hubstaff credentials not configured' },
                { status: 500 }
            );
        }

        // 1. Fetch ALL Projects
        let allProjects: any[] = [];
        let projectPageId: string | null = null;

        console.log('Fetching all projects...');
        do {
            const pageParam: string = projectPageId ? `&page_start_id=${projectPageId}` : '';
            const response = await fetch(
                `${HUBSTAFF_API_BASE}/organizations/${orgId}/projects?status=active${pageParam}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) break;

            const data = await response.json();
            allProjects = [...allProjects, ...(data.projects || [])];
            projectPageId = data.pagination?.next_page_start_id || null;
        } while (projectPageId);

        console.log(`Found ${allProjects.length} projects.`);

        // 2. Fetch ALL Activities (Last 365 days by default to capture "timeline")
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const startStr = startDate.toISOString().split('T')[0];

        let allActivities: any[] = [];
        let activityPageId: string | null = null;

        console.log(`Fetching activities since ${startStr}...`);

        // This might arguably take a while if there are TONS of activities.
        // Hubstaff paginates. We'll loop.
        do {
            const pageParam: string = activityPageId ? `&page_start_id=${activityPageId}` : '';
            // Fetch for organization (no project_ids filter = all projects)
            const url = `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?date[start]=${startStr}&date[stop]=${endDate}${pageParam}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Failed to fetch activities page:', await response.text());
                break;
            }

            const data = await response.json();
            allActivities = [...allActivities, ...(data.daily_activities || [])];
            activityPageId = data.pagination?.next_page_start_id || null;
        } while (activityPageId);

        console.log(`Found ${allActivities.length} activity records.`);

        // 3. Merge Data
        const projectMap = new Map();

        // Initialize map
        allProjects.forEach(p => {
            projectMap.set(p.id, {
                id: p.id,
                name: p.name,
                status: p.status,
                description: p.description,
                total_work_seconds: 0,
                total_work_days: 0,
                first_activity: null,
                last_activity: null,
                timeline_activities: [] // We can dump daily summaries here
            });
        });

        // Aggregate activities
        allActivities.forEach(activity => {
            const pid = activity.project_id;
            if (projectMap.has(pid)) {
                const p = projectMap.get(pid);
                p.total_work_seconds += activity.tracked;

                // Track timeline range
                if (!p.first_activity || activity.date < p.first_activity) p.first_activity = activity.date;
                if (!p.last_activity || activity.date > p.last_activity) p.last_activity = activity.date;

                // Add to list (optional: might be huge)
                p.timeline_activities.push({
                    date: activity.date,
                    seconds: activity.tracked,
                    user_id: activity.user_id
                });
            }
        });

        // Finalize
        const results = Array.from(projectMap.values()).map(p => ({
            ...p,
            total_work_days: Number((p.total_work_seconds / 28800).toFixed(2)) // 8 hours = 28800s
        }));

        // Sort by name
        results.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
            count: results.length,
            date_range: { start: startStr, end: endDate },
            projects: results
        });

    } catch (error: any) {
        console.error('Error in Hubstaff dump:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
