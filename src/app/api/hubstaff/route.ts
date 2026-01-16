import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/hubstaff-auth';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const userId = searchParams.get('userId'); // Optional: filter by specific user

    if (!date) {
        return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const orgId = process.env.HUBSTAFF_ORG_ID;
    const accessToken = await getValidAccessToken();

    if (!orgId || !accessToken) {
        return NextResponse.json(
            {
                error: 'Hubstaff credentials not configured or valid',
                message: 'Please check your .env.local and ensure you have a valid refresh token.'
            },
            { status: 500 }
        );
    }

    try {
        console.log(`Fetching activities for date: ${date}, org: ${orgId}${userId ? `, user: ${userId}` : ''}`);

        // Build API URL with optional user filter
        let apiUrl = `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?date[start]=${date}&date[stop]=${date}`;
        if (userId) {
            apiUrl += `&user_ids=${userId}`;
        }

        // Initialize activities array and pagination
        let allActivities: any[] = [];
        let nextPageStartId: any = undefined;
        let hasMore = true;

        while (hasMore) {
            let pagedUrl = apiUrl;
            if (nextPageStartId) {
                pagedUrl += `&page_start_id=${nextPageStartId}`;
            }

            console.log(`Fetching Hubstaff page: ${pagedUrl}`);

            const response = await fetch(pagedUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                // If we have partial data, maybe we should return it? For now, throw/error.
                console.error('Hubstaff API error on page fetch:', response.status, errorText);
                throw new Error(`Hubstaff API error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            if (data.daily_activities) {
                allActivities = [...allActivities, ...data.daily_activities];
            }

            // Check pagination
            if (data.pagination && data.pagination.next_page_start_id) {
                nextPageStartId = data.pagination.next_page_start_id;
            } else {
                hasMore = false;
            }
        }

        console.log(`Total raw activities fetched: ${allActivities.length}`);

        // Fetch user names for all unique user IDs
        const userIds: number[] = [...new Set(allActivities.map((a: any) => a.user_id))] as number[];
        const userNamesMap: Record<number, string> = {};

        await Promise.all(
            userIds.map(async (userId: number) => {
                try {
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
                        userNamesMap[userId] = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || `User ${userId}`;
                    }
                } catch (error) {
                    console.error(`Error fetching user ${userId}:`, error);
                    userNamesMap[userId] = `User ${userId}`;
                }
            })
        );

        // Fetch project names for all unique project IDs
        const projectIds: number[] = [...new Set(allActivities.map((a: any) => a.project_id).filter(Boolean))] as number[];
        const projectNamesMap: Record<number, string> = {};

        await Promise.all(
            projectIds.map(async (projectId: number) => {
                try {
                    const projectResponse = await fetch(
                        `${HUBSTAFF_API_BASE}/projects/${projectId}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (projectResponse.ok) {
                        const projectData = await projectResponse.json();
                        const project = projectData.project || projectData;
                        projectNamesMap[projectId] = project.name || `Project ${projectId}`;
                    }
                } catch (error) {
                    console.error(`Error fetching project ${projectId}:`, error);
                    projectNamesMap[projectId] = `Project ${projectId}`;
                }
            })
        );

        // Transform the data
        const activities: any[] = [];
        let totalTime = 0;

        allActivities.forEach((activity: any) => {
            const timeWorked = activity.tracked || 0;
            totalTime += timeWorked;

            activities.push({
                userId: activity.user_id,
                userName: userNamesMap[activity.user_id] || 'Unknown',
                date: date,
                timeWorked: timeWorked,
                // Calculate activity percentage: (overall activity / tracked time) * 100
                // overall is the sum of keyboard + mouse activity in seconds
                // tracked is the total time tracked in seconds
                activityPercentage: timeWorked > 0 ? Math.round((activity.overall / timeWorked) * 100) : 0,
                projectName: activity.project_id ? (projectNamesMap[activity.project_id] || null) : null,
                projectId: activity.project_id,
            });
        });

        console.log(`Final processed activities: ${activities.length}, total time: ${totalTime}s`);
        console.log('Activities Users:', activities.map(a => a.userName));

        return NextResponse.json({
            date,
            totalTime,
            activities,
        });
    } catch (error) {
        console.error('Error fetching Hubstaff activities:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
