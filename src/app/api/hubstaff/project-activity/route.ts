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

        // Fetch all projects (handle pagination)
        let allProjects: any[] = [];
        let pageId: string | null = null;

        do {
            const pageParam: string = pageId ? `&page_start_id=${pageId}` : '';
            const projectsResponse = await fetch(
                `${HUBSTAFF_API_BASE}/organizations/${orgId}/projects?status=active${pageParam}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!projectsResponse.ok) {
                console.error('Error fetching Hubstaff projects:', await projectsResponse.text());
                break;
            }

            const projectsData = await projectsResponse.json();
            const projects = projectsData.projects || [];
            allProjects = [...allProjects, ...projects];

            // specific to Hubstaff v2 pagination
            pageId = projectsData.pagination?.next_page_start_id || null;
        } while (pageId);

        const projects = allProjects;

        // Find project by name (case-insensitive and smarter matching)
        const normalizedInputName = projectName.toLowerCase().trim();
        let project = projects.find((p: any) =>
            p.name.toLowerCase().trim() === normalizedInputName
        );

        // If no exact match, try to find a project that contains the input name or vice versa
        if (!project) {
            project = projects.find((p: any) => {
                const pName = p.name.toLowerCase().trim();
                return pName.includes(normalizedInputName) || normalizedInputName.includes(pName);
            });
        }

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

        // Fetch time entries for this project (handle pagination)
        // Default to year 2000 if no dates provided to ensure we get "total" time (all history)
        const today = new Date();
        const pastDate = new Date('2000-01-01');

        const startParam = startDate || pastDate.toISOString().split('T')[0];
        const endParam = endDate || today.toISOString().split('T')[0];

        const dateParams = `&date[start]=${startParam}&date[stop]=${endParam}`;

        let allDailyActivities: any[] = [];
        let activitiesPageId: string | null = null;

        do {
            const pageParam: string = activitiesPageId ? `&page_start_id=${activitiesPageId}` : '';
            const activitiesResponse = await fetch(
                `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?project_ids=${project.id}${dateParams}${pageParam}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!activitiesResponse.ok) {
                console.error('Error fetching Hubstaff activities:', await activitiesResponse.text());
                break;
            }

            const activitiesData = await activitiesResponse.json();
            const dailyActivities = activitiesData.daily_activities || [];
            allDailyActivities = [...allDailyActivities, ...dailyActivities];

            activitiesPageId = activitiesData.pagination?.next_page_start_id || null;
        } while (activitiesPageId);

        const dailyActivities = allDailyActivities;

        // Fetch Hubstaff Teams to map users accurately
        const teamsResponse = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/teams`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const teamsData = await teamsResponse.json();
        const teams = teamsData.teams || [];

        // Define mapping from Hubstaff Team Name to App Team Name
        const HUBSTAFF_TEAM_MAPPING: Record<string, string> = {
            'UI/UX Designers': 'Design',
            'Frontend Developers': 'FE Dev',
            'Backend Developers': 'BE Dev',
            'QA Developers': 'Testing',
            'WordPress Developers': 'FE Dev', // Mapping WP to FE for now
            'Mobile App Developers': 'FE Dev'  // Mapping Mobile to FE for now
        };

        const userTeamMap: Record<number, string> = {};
        const userNameMap: Record<number, string> = {};

        // Fetch members for each relevant team
        for (const team of teams) {
            const appTeamName = HUBSTAFF_TEAM_MAPPING[team.name];
            if (appTeamName) {
                // Fetch members for this specific team
                const teamMembersResponse = await fetch(
                    `${HUBSTAFF_API_BASE}/teams/${team.id}/members?include=users`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (teamMembersResponse.ok) {
                    const tmData = await teamMembersResponse.json();
                    const teamMembers = tmData.team_members || [];
                    const users = tmData.users || [];

                    // Create lookup for user details
                    const usersSdk = users.reduce((acc: any, u: any) => {
                        acc[u.id] = u;
                        return acc;
                    }, {});

                    for (const member of teamMembers) {
                        userTeamMap[member.user_id] = appTeamName;
                        const user = usersSdk[member.user_id];
                        if (user) {
                            userNameMap[member.user_id] = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                        }
                    }
                }
            }
        }

        // Fallback: Fetch ALL organization members to get names for anyone NOT in a team
        // and to handle "Unknown" team assignment if they aren't in the mapped teams
        const allMembersResponse = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/members?include=users`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (allMembersResponse.ok) {
            const amData = await allMembersResponse.json();
            const allUsers = amData.users || [];

            for (const user of allUsers) {
                if (!userNameMap[user.id]) {
                    userNameMap[user.id] = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                }
                if (!userTeamMap[user.id]) {
                    // Try to guess if not in a specific team, or leave as Unknown
                    userTeamMap[user.id] = determineUserTeam(user);
                }
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
