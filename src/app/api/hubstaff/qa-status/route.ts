import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { mapTaskFromDB, type Task } from '@/lib/types';
import { formatDateDDMMYYYY, formatTime } from '@/lib/hubstaff-utils';
import { mapHubstaffNameToQA, getHubstaffNameFromQA } from '@/lib/hubstaff-name-mapping';
import { getValidAccessToken } from '@/lib/hubstaff-auth';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

interface HubstaffActivity {
    timeWorked: number;
    activityPercentage: number;
    projects: string[];
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get('date'); // YYYY-MM-DD format
        const qaName = searchParams.get('qaName');

        if (!date || !qaName) {
            return NextResponse.json(
                { error: 'Missing required parameters: date and qaName' },
                { status: 400 }
            );
        }

        // Get Hubstaff name from QA name
        const hubstaffName = getHubstaffNameFromQA(qaName);

        // Get mapped QA name (e.g. "Aswathi M Ashok" -> "Aswathi")
        const mappedQaName = mapHubstaffNameToQA(qaName);
        console.log(`[API] Fetching tasks for QA: "${qaName}" (Mapped: "${mappedQaName}")`);

        // Fetch ALL tasks and filter in code for better name matching
        // This approach is more flexible for handling name variations
        const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (tasksError) {
            console.error('Error fetching tasks:', tasksError);
            return NextResponse.json(
                { error: 'Failed to fetch tasks from database' },
                { status: 500 }
            );
        }

        const tasks: Task[] = (tasksData || []).map(mapTaskFromDB);

        // Filter tasks for this specific member using case-insensitive matching
        const memberTasks = tasks.filter(task => {
            const assigned1 = (task.assignedTo || '').trim().toLowerCase();
            const assigned2 = (task.assignedTo2 || '').trim().toLowerCase();
            const qName = qaName.trim().toLowerCase();
            const mName = mappedQaName.trim().toLowerCase();
            const hName = (hubstaffName || '').trim().toLowerCase();

            // Strict matching only
            // 1. Direct match with Input Name (qaName)
            // 2. Match with Mapped Short Name (mappedQaName) - e.g. "Aswathi M Ashok" -> "Aswathi"
            // 3. Match with Hubstaff Full Name (hubstaffName) - e.g. "Aswathi" -> "Aswathi M Ashok"

            const isMatch1 = assigned1 && (assigned1 === qName || assigned1 === mName || (hName && assigned1 === hName));
            const isMatch2 = assigned2 && (assigned2 === qName || assigned2 === mName || (hName && assigned2 === hName));

            const isMatch = isMatch1 || isMatch2;

            // Debug logging for first few tasks
            if (tasks.indexOf(task) < 3) {
                console.log(`[DEBUG] Task: ${task.projectName}, Assigned: "${assigned1}", Match: ${isMatch}`);
                console.log(`  Comparing with qName: "${qName}", mName: "${mName}"`);
            }

            return isMatch;
        });

        console.log(`[API] Fetched ${tasks.length} total tasks from database`);
        if (tasks.length > 0) {
            console.log(`[API] Sample assignees from first 3 tasks:`, tasks.slice(0, 3).map(t => ({ project: t.projectName, assigned: t.assignedTo })));
        }

        console.log(`[API] Found ${memberTasks.length} tasks for ${qaName} (out of ${tasks.length} total)`);

        // Filter tasks relevant for the report
        // 1. Active: Scheduled for today AND not completed/rejected
        // 2. Completed Today: Status is completed AND actualEndDate is today
        const relevantTasks = memberTasks.filter(task => {
            // Check for Completed Today
            if (task.status === 'Completed') {
                if (task.actualEndDate) {
                    const actualEnd = new Date(task.actualEndDate).toISOString().split('T')[0];
                    return actualEnd === date;
                }
                return false; // Completed but no date (or assume not today)
            }

            // Check for Active (Not Completed/Rejected/On Hold)
            if (task.status !== 'Rejected' && task.status !== 'On Hold') {
                if (!task.startDate || !task.endDate) return false;
                const start = new Date(task.startDate).toISOString().split('T')[0];

                // Active or Overdue: Include if report date is on or after start date
                // We filter out future tasks (date < start)
                return date >= start;
            }

            return false;
        });

        const orgId = process.env.HUBSTAFF_ORG_ID;
        const accessToken = await getValidAccessToken();

        if (!orgId || !accessToken) {
            return NextResponse.json(
                { error: 'HUBSTAFF_ORG_ID or HUBSTAFF_ACCESS_TOKEN not configured or expired' },
                { status: 500 }
            );
        }

        // Note: Hubstaff activity fetching is preserved for the 'hubstaffActivity' value in JSON response,
        // but removed from the text report as per request.
        let hubstaffActivity: HubstaffActivity = {
            timeWorked: 0,
            activityPercentage: 0,
            projects: [],
        };

        if (orgId && accessToken) {
            try {
                // Fetch user ID for this QA (need to get from users API)
                const usersResponse = await fetch(
                    `${HUBSTAFF_API_BASE}/organizations/${orgId}/members`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (usersResponse.ok) {
                    const usersData = await usersResponse.json();
                    const members = usersData.organization_memberships || usersData.members || [];

                    // Find user by matching Hubstaff name
                    let userId: number | null = null;
                    for (const member of members) {
                        const memberId = member.user_id || member.id;
                        const userResponse = await fetch(
                            `${HUBSTAFF_API_BASE}/users/${memberId}`,
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

                            // 1. Direct Name Match (e.g. "Aswathi M Ashok" === "Aswathi M Ashok")
                            if (userName === qaName) {
                                userId = memberId;
                                console.log(`[API] Matched user by direct name: "${userName}"`);
                                break;
                            }
                            // 2. Reverse Lookup Match (Input was Short Name, e.g. "Aswathi", matches "Aswathi M Ashok")
                            else if (hubstaffName && userName === hubstaffName) {
                                userId = memberId;
                                console.log(`[API] Matched user by reverse lookup: "${userName}"`);
                                break;
                            }
                            // 3. Mapped Match (Input was Short Name, mapped user name matches input)
                            else if (mapHubstaffNameToQA(userName) === qaName) {
                                userId = memberId;
                                console.log(`[API] Matched user by mapped name: "${userName}" -> "${qaName}"`);
                                break;
                            }
                        }
                    }

                    if (userId) {
                        // Fetch activities for this user and date
                        // Fetch activities for this user and date with pagination
                        let dailyActivities: any[] = [];
                        let nextPageStartId: any = undefined;
                        let hasMore = true;

                        while (hasMore) {
                            let pagedUrl = `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?date[start]=${date}&date[stop]=${date}&user_ids=${userId}`;
                            if (nextPageStartId) {
                                pagedUrl += `&page_start_id=${nextPageStartId}`;
                            }

                            const activitiesResponse = await fetch(
                                pagedUrl,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${accessToken}`,
                                        'Content-Type': 'application/json',
                                    },
                                }
                            );

                            if (activitiesResponse.ok) {
                                const activitiesData = await activitiesResponse.json();
                                if (activitiesData.daily_activities) {
                                    dailyActivities = [...dailyActivities, ...activitiesData.daily_activities];
                                }

                                if (activitiesData.pagination && activitiesData.pagination.next_page_start_id) {
                                    nextPageStartId = activitiesData.pagination.next_page_start_id;
                                } else {
                                    hasMore = false;
                                }
                            } else {
                                console.error('Error fetching Hubstaff activities page:', await activitiesResponse.text());
                                hasMore = false;
                            }
                        }

                        // Fetch project names
                        const projectIds: number[] = [...new Set(dailyActivities.map((a: any) => a.project_id).filter(Boolean))] as number[];
                        const projectNamesMap: Record<number, string> = {};

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
                                }
                            })
                        );

                        // Aggregate activity data
                        let totalTime = 0;
                        let totalActivityWeighted = 0;
                        const projectSet = new Set<string>();

                        console.log(`[API] Processing ${dailyActivities.length} daily_activities for ${qaName}`);

                        dailyActivities.forEach((activity: any, index: number) => {
                            const timeWorked = activity.tracked || 0;
                            const activityPct = timeWorked > 0 ? Math.round((activity.overall / timeWorked) * 100) : 0;

                            console.log(`[API] Activity ${index + 1}: tracked=${timeWorked}s, overall=${activity.overall}s, activity%=${activityPct}%, project_id=${activity.project_id}`);

                            totalTime += timeWorked;
                            totalActivityWeighted += activityPct * timeWorked;

                            // Instead of using Hubstaff project names, use project names from the tasks
                            // This ensures we show the correct project names from our database
                            // We'll populate this from the relevant tasks instead
                        });

                        // Get unique project names from the relevant tasks instead of Hubstaff
                        relevantTasks.forEach(task => {
                            if (task.projectName) {
                                projectSet.add(task.projectName);
                            }
                        });

                        console.log(`[API] Total time: ${totalTime}s (${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m)`);
                        console.log(`[API] Weighted activity: ${totalActivityWeighted}, Average: ${totalTime > 0 ? Math.round(totalActivityWeighted / totalTime) : 0}%`);
                        console.log(`[API] Projects from tasks: ${Array.from(projectSet).join(', ')}`);

                        hubstaffActivity = {
                            timeWorked: totalTime,
                            activityPercentage: totalTime > 0 ? Math.round(totalActivityWeighted / totalTime) : 0,
                            projects: Array.from(projectSet),
                        };
                    }
                }
            } catch (error) {
                console.error('Error fetching Hubstaff activity:', error);
            }
        }

        // Generate formatted text report
        const formattedText = generateWorkStatusText(qaName, date, relevantTasks);
        console.log('[API] Generated formatted text length:', formattedText.length);
        console.log('[API] Formatted text start:', formattedText.substring(0, 20));

        return NextResponse.json({
            qaName,
            date,
            hubstaffActivity,
            tasks: relevantTasks,
            formattedText,
        });

    } catch (error) {
        console.error('Error generating QA work status:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate work status',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

function generateWorkStatusText(
    qaName: string,
    date: string,
    tasks: Task[]
): string {
    const formattedDate = formatDateDDMMYYYY(date);

    let text = `📋 *Work Status (v2 Checks) - ${formattedDate}*\n`;
    text += `👤 *Name:* ${qaName}\n\n`;

    // Categorize tasks
    const activeTasks = tasks.filter(t => t.status !== 'Completed');
    const completedTasks = tasks.filter(t => t.status === 'Completed');

    // === ACTIVE TASKS ===
    if (activeTasks.length > 0) {
        text += `🔄 *=== ACTIVE TASKS ===*\n\n`;
        activeTasks.forEach((task, index) => {
            text += `*${index + 1}. ${task.subPhase || task.projectName}*\n`;
            text += `📁 *Project:* ${task.projectName}\n`;
            text += `📅 *Start Date:* ${task.startDate ? formatDateDDMMYYYY(task.startDate) : 'Not set'}\n`;
            text += `⏰ *Expected End Date:* ${task.endDate ? formatDateDDMMYYYY(task.endDate) : 'Not set'}\n`;
            text += `✅ *Actual End Date:* ${task.actualEndDate ? formatDateDDMMYYYY(task.actualEndDate) : 'Not completed'}\n`;
            text += `📊 *Status:* ${task.status}\n`;
            const isDeviated = task.deviationReason && task.deviationReason.trim() !== '';
            text += `✅ *Deviated:* ${isDeviated ? 'Yes' : 'No'}\n`;
            text += `\n`;
        });
    }

    // === COMPLETED TODAY ===
    if (completedTasks.length > 0) {
        text += `🎉 *=== COMPLETED TODAY ===*\n\n`;
        completedTasks.forEach((task, index) => {
            text += `*${index + 1}. ${task.subPhase || task.projectName}*\n`;
            text += `📁 *Project:* ${task.projectName}\n`;
            text += `📅 *Start Date:* ${task.startDate ? formatDateDDMMYYYY(task.startDate) : 'Not set'}\n`;
            text += `⏰ *Expected End Date:* ${task.endDate ? formatDateDDMMYYYY(task.endDate) : 'Not set'}\n`;
            text += `✅ *Actual End Date:* ${task.actualEndDate ? formatDateDDMMYYYY(task.actualEndDate) : 'N/A'}\n`;
            text += `📊 *Status:* ${task.status}\n`;
            const isDeviated = task.deviationReason && task.deviationReason.trim() !== '';
            text += `✅ *Deviated:* ${isDeviated ? 'Yes' : 'No'}\n`;
            text += `\n`;
        });
    }

    // === SUMMARY ===
    const rejectedCount = tasks.filter(t => t.status === 'Rejected').length;

    // Calculating Overdue
    const overdueCount = tasks.filter(t => {
        if (!t.endDate || t.status === 'Completed') return false;
        const endDate = new Date(t.endDate).toISOString().split('T')[0];
        return date > endDate;
    }).length;

    text += `📊 *=== SUMMARY ===*\n`;
    text += `📋 *Total Tasks for Today:* ${tasks.length}\n`;
    text += `🔄 *Active Tasks:* ${activeTasks.length}\n`;
    text += `🎉 *Completed Today:* ${completedTasks.length}\n`;
    text += `❌ *Rejected Tasks:* ${rejectedCount}\n`;
    text += `🚨 *Overdue Tasks:* ${overdueCount}`;

    return text;
}
