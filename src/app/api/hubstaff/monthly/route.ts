import { NextRequest, NextResponse } from 'next/server';
import { getDaysInMonth, aggregateMonthlyData, type DailyActivity } from '@/lib/hubstaff-utils';
import { mapHubstaffNameToQA } from '@/lib/hubstaff-name-mapping';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';
const HUBSTAFF_AUTH_BASE = 'https://account.hubstaff.com/access_tokens';

// Cache for access tokens (shared with other Hubstaff APIs)
let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(refreshToken: string): Promise<string | null> {
    // Return cached token if still valid
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        console.log('Using cached access token');
        return cachedAccessToken;
    }

    try {
        console.log('Exchanging refresh token for access token...');
        const response = await fetch(HUBSTAFF_AUTH_BASE, {
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }).toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
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
        const searchParams = request.nextUrl.searchParams;
        const month = parseInt(searchParams.get('month') || '');
        const year = parseInt(searchParams.get('year') || '');
        const userId = searchParams.get('userId'); // Optional: filter by specific user

        // Validate parameters
        if (!month || !year || month < 1 || month > 12 || year < 2000) {
            return NextResponse.json(
                { error: 'Invalid month or year parameter' },
                { status: 400 }
            );
        }

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

        // Get all days in the month
        const days = getDaysInMonth(month, year);
        console.log(`Fetching Hubstaff data for ${days.length} days in ${month}/${year}`);

        // Fetch user names first (for mapping)
        const userNamesMap: Record<number, string> = {};

        // Fetch activities for each day in parallel (with batching to avoid overwhelming the API)
        const batchSize = 5; // Process 5 days at a time
        const allActivities: DailyActivity[] = [];

        for (let i = 0; i < days.length; i += batchSize) {
            const batch = days.slice(i, i + batchSize);

            const batchPromises = batch.map(async (date) => {
                try {
                    // Build URL for daily activities
                    let url = `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?date[start]=${date}&date[stop]=${date}`;
                    if (userId) {
                        url += `&user_ids=${userId}`;
                    }

                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        console.error(`Failed to fetch activities for ${date}: ${response.status}`);
                        return [];
                    }

                    const data = await response.json();
                    const dailyActivities = data.daily_activities || [];

                    // Fetch user names for unique user IDs in this batch
                    const userIds: number[] = [...new Set(dailyActivities.map((a: any) => a.user_id))] as number[];

                    await Promise.all(
                        userIds.map(async (uid: number) => {
                            if (!userNamesMap[uid]) {
                                try {
                                    const userResponse = await fetch(
                                        `${HUBSTAFF_API_BASE}/users/${uid}`,
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
                                        userNamesMap[uid] = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || `User ${uid}`;
                                    }
                                } catch (error) {
                                    console.error(`Error fetching user ${uid}:`, error);
                                    userNamesMap[uid] = `User ${uid}`;
                                }
                            }
                        })
                    );

                    // Fetch project names for unique project IDs
                    const projectNamesMap: Record<number, string> = {};
                    const projectIds: number[] = [...new Set(dailyActivities.map((a: any) => a.project_id).filter(Boolean))] as number[];

                    await Promise.all(
                        projectIds.map(async (pid: number) => {
                            try {
                                const projectResponse = await fetch(
                                    `${HUBSTAFF_API_BASE}/projects/${pid}`,
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
                                    projectNamesMap[pid] = project.name || `Project ${pid}`;
                                }
                            } catch (error) {
                                console.error(`Error fetching project ${pid}:`, error);
                                projectNamesMap[pid] = `Project ${pid}`;
                            }
                        })
                    );

                    // Transform activities
                    return dailyActivities.map((activity: any) => {
                        const userName = userNamesMap[activity.user_id] || 'Unknown';
                        const qaName = mapHubstaffNameToQA(userName);

                        return {
                            date,
                            userId: activity.user_id,
                            userName,
                            qaName,
                            projectId: activity.project_id,
                            projectName: activity.project_id ? (projectNamesMap[activity.project_id] || null) : null,
                            timeWorked: activity.tracked || 0,
                            activityPercentage: activity.tracked > 0 ? Math.round((activity.overall / activity.tracked) * 100) : 0,
                        } as DailyActivity;
                    });
                } catch (error) {
                    console.error(`Error processing date ${date}:`, error);
                    return [];
                }
            });

            const batchResults = await Promise.all(batchPromises);
            allActivities.push(...batchResults.flat());

            // Log progress
            console.log(`Processed ${Math.min(i + batchSize, days.length)}/${days.length} days`);
        }

        console.log(`Total activities fetched: ${allActivities.length}`);

        // Aggregate the data
        const monthlyData = aggregateMonthlyData(allActivities, month, year);

        return NextResponse.json(monthlyData);

    } catch (error) {
        console.error('Error fetching monthly Hubstaff data:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch monthly data',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
