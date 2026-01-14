import { NextRequest, NextResponse } from 'next/server';
import { TEAM_MEMBERS, DEPARTMENTS, type TeamMemberConfig } from '@/lib/team-members-config';
import { getValidAccessToken } from '@/lib/hubstaff-auth';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
        }

        const accessToken = await getValidAccessToken();
        const orgId = process.env.HUBSTAFF_ORG_ID;

        // DEBUG LOGGING
        console.log(`[HR_DAILY] OrgID configured: ${!!orgId}`);
        console.log(`[HR_DAILY] Access Token retrieved: ${!!accessToken}`);

        if (!accessToken || !orgId) {
            console.error('[HR_DAILY] Missing credentials - sending 500 error');
            return NextResponse.json({
                error: 'Hubstaff credentials not configured',
                message: 'Please update your authentication settings.'
            }, { status: 500 });
        }

        // Fetch activities for the date
        const activitiesUrl = `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?date[start]=${date}&date[stop]=${date}`;
        const activitiesResponse = await fetch(activitiesUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!activitiesResponse.ok) {
            const errorText = await activitiesResponse.text();
            console.error('Failed to fetch activities:', errorText);
            throw new Error(`Failed to fetch activities: ${activitiesResponse.statusText}`);
        }

        const activitiesData = await activitiesResponse.json();
        const activities = activitiesData.daily_activities || [];

        console.log(`HR Daily: Found ${activities.length} activities for date ${date}`);
        if (activities.length > 0) {
            console.log('Sample activity:', JSON.stringify(activities[0], null, 2));
        }

        // Fetch user names
        const userIds: number[] = [...new Set(activities.map((a: any) => a.user_id))] as number[];
        const userNamesMap: Record<number, string> = {};

        await Promise.all(
            userIds.map(async (userId: number) => {
                try {
                    const userResponse = await fetch(`${HUBSTAFF_API_BASE}/users/${userId}`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        const user = userData.user || userData;
                        userNamesMap[userId] = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                    }
                } catch (error) {
                    console.error(`Error fetching user ${userId}:`, error);
                }
            })
        );

        // Fetch project names
        const projectIds: number[] = [...new Set(activities.map((a: any) => a.project_id).filter(Boolean))] as number[];
        const projectNamesMap: Record<number, string> = {};

        await Promise.all(
            projectIds.map(async (projectId: number) => {
                try {
                    const projectResponse = await fetch(`${HUBSTAFF_API_BASE}/projects/${projectId}`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (projectResponse.ok) {
                        const projectData = await projectResponse.json();
                        const project = projectData.project || projectData;
                        projectNamesMap[projectId] = project.name;
                    }
                } catch (error) {
                    console.error(`Error fetching project ${projectId}:`, error);
                }
            })
        );

        // Group activities by department
        const departmentData: Record<string, any[]> = {};
        DEPARTMENTS.forEach(dept => {
            departmentData[dept] = [];
        });

        // Process each configured team member
        TEAM_MEMBERS.forEach(member => {
            // Find activities for this member
            const memberActivities = activities.filter((activity: any) => {
                const userName = userNamesMap[activity.user_id];
                return userName === member.hubstaffName;
            });

            if (memberActivities.length > 0) {
                // Aggregate data for this member
                const totalTime = memberActivities.reduce((sum: number, a: any) => sum + (a.tracked || 0), 0);

                // Calculate activity percentage correctly
                // 'overall' is the number of seconds of activity (keyboard/mouse)
                // 'tracked' is the total number of seconds tracked
                // Activity % = (overall / tracked) * 100
                const totalActivitySeconds = memberActivities.reduce((sum: number, a: any) => sum + (a.overall || 0), 0);

                // Calculate active time (only include time segments where activity > 0)
                const activeTime = memberActivities.reduce((sum: number, a: any) => {
                    return (a.overall > 0) ? sum + (a.tracked || 0) : sum;
                }, 0);

                let avgActivity = 0;
                // Use activeTime as denominator to exclude 0% activity periods (like meetings)
                if (activeTime > 0) {
                    avgActivity = Math.round((totalActivitySeconds / activeTime) * 100);
                }

                // Get project names
                const projectNames = [...new Set(memberActivities.map((a: any) => projectNamesMap[a.project_id] || 'Unknown').filter(Boolean))];

                console.log(`${member.name}: ${totalTime}s (${Math.floor(totalTime / 60)}m), activity: ${totalActivitySeconds}s/${totalTime}s = ${avgActivity}%`);

                departmentData[member.department].push({
                    name: member.name,
                    hubstaffName: member.hubstaffName,
                    timeWorked: totalTime,
                    activityPercentage: avgActivity,
                    projects: projectNames,
                    floorTime: '', // Blank for HR to fill
                });
            } else {
                // No activity for this member
                departmentData[member.department].push({
                    name: member.name,
                    hubstaffName: member.hubstaffName,
                    timeWorked: 0,
                    activityPercentage: 0,
                    projects: [],
                    floorTime: '', // Blank for HR to fill
                });
            }
        });

        return NextResponse.json({
            date,
            departmentData,
            departments: DEPARTMENTS,
        });

    } catch (error: any) {
        console.error('Error fetching HR daily data:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch HR daily data' },
            { status: 500 }
        );
    }
}
