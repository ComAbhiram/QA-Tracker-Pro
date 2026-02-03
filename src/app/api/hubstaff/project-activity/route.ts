import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/hubstaff-auth';
import { determineUserTeam } from '@/lib/hubstaff-team-mapping';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

interface TeamMember {
    user_id: number;
    user_name: string;
    team: string;
}

interface HubstaffTimeEntry {
    user_id: number;
    user_name: string;
    team: string;
    hours: number;
    activity_percentage: number;
}

// GET: Fetch Hubstaff time and activity data for a project
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const projectName = searchParams.get('project_name');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        if (!projectName) {
            return NextResponse.json(
                { error: 'Project name is required' },
                { status: 400 }
            );
        }

        const orgId = process.env.HUBSTAFF_ORG_ID;
        const accessToken = await getValidAccessToken();

        if (!orgId || !accessToken) {
            return NextResponse.json(
                { error: 'Hubstaff credentials not configured' },
                { status: 500 }
            );
        }

        // Fetch all projects to find matching project
        const projectsResponse = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/projects`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!projectsResponse.ok) {
            console.error('Error fetching Hubstaff projects:', await projectsResponse.text());
            return NextResponse.json(
                { error: 'Failed to fetch Hubstaff projects' },
                { status: 500 }
            );
        }

        const projectsData = await projectsResponse.json();
        const projects = projectsData.projects || [];

        // Find project by name (case-insensitive)
        const project = projects.find((p: any) =>
            p.name.toLowerCase() === projectName.toLowerCase()
        );

        if (!project) {
            return NextResponse.json({
                project_name: projectName,
                hs_time_taken_days: 0,
                activity_percentage: 0,
                team_breakdown: {
                    design_days: 0,
                    fe_dev_days: 0,
                    be_dev_days: 0,
                    testing_days: 0
                },
                member_activities: [],
                total_work_days: 0
            });
        }

        // Fetch time entries for this project
        const dateParams = startDate && endDate
            ? `&date[start]=${startDate}&date[stop]=${endDate}`
            : '';

        const activitiesResponse = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?project_ids=${project.id}${dateParams}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!activitiesResponse.ok) {
            console.error('Error fetching Hubstaff activities:', await activitiesResponse.text());
            return NextResponse.json(
                { error: 'Failed to fetch Hubstaff activities' },
                { status: 500 }
            );
        }

        const activitiesData = await activitiesResponse.json();
        const dailyActivities = activitiesData.daily_activities || [];

        // Fetch user details to determine teams
        const membersResponse = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/members`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const membersData = await membersResponse.json();
        const members = membersData.organization_memberships || membersData.members || [];

        // Map user IDs to team names
        const userTeamMap: Record<number, string> = {};
        const userNameMap: Record<number, string> = {};

        for (const member of members) {
            const userId = member.user_id || member.id;
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
                const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();

                userNameMap[userId] = userName;
                userTeamMap[userId] = determineUserTeam(user);
            }
        }

        // Aggregate time by team
        const teamTotals = {
            Design: 0,
            'FE Dev': 0,
            'BE Dev': 0,
            Testing: 0
        };

        const memberActivities: any[] = [];
        let totalTime = 0;
        let totalActivityWeighted = 0;

        dailyActivities.forEach((activity: any) => {
            const timeWorked = activity.tracked || 0;
            const activityPct = timeWorked > 0 ? Math.round((activity.overall / timeWorked) * 100) : 0;
            const hours = timeWorked / 3600;

            const userId = activity.user_id;
            const team = userTeamMap[userId] || 'Unknown';
            const userName = userNameMap[userId] || activity.user_name || `User ${userId}`;

            totalTime += timeWorked;
            totalActivityWeighted += activityPct * timeWorked;

            // Add to team totals
            if (team in teamTotals) {
                teamTotals[team as keyof typeof teamTotals] += hours;
            }

            // Track individual member activity
            const existingMember = memberActivities.find(m => m.user_id === userId);
            if (existingMember) {
                existingMember.hours += hours;
                existingMember.activity_percentage = Math.round(
                    ((existingMember.activity_percentage * existingMember.hours) + (activityPct * hours)) /
                    (existingMember.hours + hours)
                );
            } else {
                memberActivities.push({
                    user_id: userId,
                    user_name: userName,
                    team,
                    hours,
                    activity_percentage: activityPct
                });
            }
        });

        // Convert hours to days (8 hours = 1 day)
        const teamBreakdown = {
            design_days: teamTotals.Design / 8,
            fe_dev_days: teamTotals['FE Dev'] / 8,
            be_dev_days: teamTotals['BE Dev'] / 8,
            testing_days: teamTotals.Testing / 8
        };

        const totalWorkDays = Object.values(teamTotals).reduce((a, b) => a + b, 0) / 8;
        const avgActivity = totalTime > 0 ? Math.round(totalActivityWeighted / totalTime) : 0;

        return NextResponse.json({
            project_name: projectName,
            hs_time_taken_days: totalWorkDays,
            activity_percentage: avgActivity,
            team_breakdown: teamBreakdown,
            member_activities: memberActivities,
            total_work_days: totalWorkDays
        });

    } catch (error) {
        console.error('Error fetching Hubstaff project data:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
