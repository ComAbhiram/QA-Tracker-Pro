import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getValidAccessToken } from '@/lib/hubstaff-auth';
import { determineUserTeam } from '@/lib/hubstaff-team-mapping';

export const dynamic = 'force-dynamic';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

interface TeamMember {
    user_id: number;
    user_name: string;
    team: string;
}

// Global cache for Hubstaff projects and teams to avoid rate limits
let projectsCache: { data: any[], timestamp: number } | null = null;
let teamsCache: { data: any[], timestamp: number } | null = null;
let userTeamMapCache: { data: Record<number, string>, timestamp: number } | null = null;
let userNameMapCache: { data: Record<number, string>, timestamp: number } | null = null;

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache


interface HubstaffTimeEntry {
    user_id: number;
    user_name: string;
    team: string;
    hours: number;
    activity_percentage: number;
}

// GET: Fetch Hubstaff time and activity data for a project
export async function GET(request: NextRequest) {
    const logs: string[] = [];
    const logFile = path.join(process.cwd(), 'hubstaff_api_debug.log');

    const addLog = (msg: string) => {
        const timestamp = new Date().toISOString();
        const fullMsg = `[${timestamp}] ${msg}`;
        console.log(fullMsg);
        logs.push(fullMsg);
        try {
            fs.appendFileSync(logFile, fullMsg + '\n');
        } catch (e) {
            // ignore fs errors
        }
    };

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
            addLog('[Hubstaff API] Credentials missing');
            return NextResponse.json(
                { error: 'Hubstaff credentials not configured' },
                { status: 500 }
            );
        }

        // 1. Fetch Projects (from cache or API)
        let projects: any[] = [];
        const now = Date.now();

        if (projectsCache && (now - projectsCache.timestamp < CACHE_TTL)) {
            projects = projectsCache.data;
            addLog(`[Hubstaff API] Projects list loaded from cache (${projects.length} projects)`);
        } else {
            addLog('[Hubstaff API] Fetching projects from Hubstaff API (cache expired or missing)');
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
                    addLog(`[Hubstaff API] Error fetching projects: ${projectsResponse.status}`);
                    break;
                }

                const projectsData = await projectsResponse.json();
                const foundProjects = projectsData.projects || [];
                allProjects = [...allProjects, ...foundProjects];
                pageId = projectsData.pagination?.next_page_start_id || null;
            } while (pageId);

            projects = allProjects;
            projectsCache = { data: projects, timestamp: now };
        }

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

        addLog(`[Hubstaff API] Search for project: "${projectName}"`);
        if (project) {
            addLog(`[Hubstaff API] Found matching project: "${project.name}" (ID: ${project.id})`);
        } else {
            addLog(`[Hubstaff API] No matching project found for "${projectName}" among ${projects.length} active projects.`);
            // Log first 5 project names for debugging
            addLog(`[Hubstaff API] First 5 active projects: ${projects.slice(0, 5).map((p: any) => p.name).join(', ')}`);
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
                total_work_days: 0,
                debug_logs: logs
            });
        }

        // Fetch time entries for this project
        // Limit range to last 90 days if not provided, to avoid massive payloads and potential API timeouts/rate limits
        const today = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(today.getDate() - 90);

        const startParam = startDate || ninetyDaysAgo.toISOString().split('T')[0];
        const endParam = endDate || today.toISOString().split('T')[0];

        const dateParams = `&date[start]=${startParam}&date[stop]=${endParam}`;
        addLog(`[Hubstaff API] Activity date range: ${startParam} to ${endParam}`);

        let allDailyActivities: any[] = [];
        let activitiesPageId: string | null = null;

        do {
            const pageParam: string = activitiesPageId ? `&page_start_id=${activitiesPageId}` : '';
            const url = `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?project_ids=${project.id}${dateParams}${pageParam}`;
            addLog(`[Hubstaff API] Fetching activities: ${url}`);

            const activitiesResponse = await fetch(
                url,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!activitiesResponse.ok) {
                const errorText = await activitiesResponse.text();
                addLog(`[Hubstaff API] Error fetching Hubstaff activities: ${activitiesResponse.status} ${activitiesResponse.statusText} - ${errorText}`);
                break;
            }

            const activitiesData = await activitiesResponse.json();
            const dailyActivities = activitiesData.daily_activities || [];
            addLog(`[Hubstaff API] Found ${dailyActivities.length} daily activity records on this page.`);
            allDailyActivities = [...allDailyActivities, ...dailyActivities];

            activitiesPageId = activitiesData.pagination?.next_page_start_id || null;
        } while (activitiesPageId);

        const dailyActivities = allDailyActivities;

        // 3. Fetch Hubstaff Teams and Members (from cache or API)
        const userTeamMap: Record<number, string> = userTeamMapCache && (now - userTeamMapCache.timestamp < CACHE_TTL)
            ? userTeamMapCache.data : {};
        const userNameMap: Record<number, string> = userNameMapCache && (now - userNameMapCache.timestamp < CACHE_TTL)
            ? userNameMapCache.data : {};

        if (Object.keys(userTeamMap).length === 0) {
            addLog('[Hubstaff API] Building Teams and Members cache');
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
            addLog(`[Hubstaff API] Found ${teams.length} teams in Hubstaff`);

            const HUBSTAFF_TEAM_MAPPING: Record<string, string> = {
                'UI/UX Designers': 'Design',
                'Frontend Developers': 'FE Dev',
                'Backend Developers': 'BE Dev',
                'QA Developers': 'Testing',
                'WordPress Developers': 'FE Dev',
                'Mobile App Developers': 'FE Dev'
            };

            for (const team of teams) {
                const appTeamName = HUBSTAFF_TEAM_MAPPING[team.name];
                if (appTeamName) {
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
                        const usersSdk = users.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});

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

            // Organization members fallback
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
                        userTeamMap[user.id] = determineUserTeam(user);
                    }
                }
            }

            userTeamMapCache = { data: userTeamMap, timestamp: now };
            userNameMapCache = { data: userNameMap, timestamp: now };
        } else {
            addLog('[Hubstaff API] Team and Member mapping loaded from cache');
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
                    ((existingMember.activity_percentage * (existingMember.hours - hours)) + (activityPct * hours)) /
                    existingMember.hours
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

        addLog(`[Hubstaff API] Calculated total work days: ${Object.values(teamTotals).reduce((a, b) => a + b, 0) / 8} for project "${project.name}"`);

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
            total_work_days: totalWorkDays,
            debug_logs: logs
        });

    } catch (error) {
        console.error('Error fetching Hubstaff project data:', error);
        return NextResponse.json(
            { error: 'Internal server error', debug_logs: logs },
            { status: 500 }
        );
    }
}
