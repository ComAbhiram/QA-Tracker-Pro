import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { mapTaskFromDB, type Task } from '@/lib/types';
import { formatDateDDMMYYYY, formatTime } from '@/lib/hubstaff-utils';
import { mapHubstaffNameToQA, getHubstaffNameFromQA } from '@/lib/hubstaff-name-mapping';
import { hubstaffClient } from '@/lib/hubstaff-client';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

interface HubstaffActivity {
    timeWorked: number;
    activityPercentage: number;
    projects: string[];
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
            const additional = (task.additionalAssignees || []).map(a => a.trim().toLowerCase());

            const qName = qaName.trim().toLowerCase();
            const mName = mappedQaName.trim().toLowerCase();
            const hName = (hubstaffName || '').trim().toLowerCase();

            // Strict matching only
            // 1. Direct match with Input Name (qaName)
            // 2. Match with Mapped Short Name (mappedQaName) - e.g. "Aswathi M Ashok" -> "Aswathi"
            // 3. Match with Hubstaff Full Name (hubstaffName) - e.g. "Aswathi" -> "Aswathi M Ashok"

            const matchesName = (name: string) => name && (name === qName || name === mName || (hName && name === hName));

            const isMatch1 = matchesName(assigned1);
            const isMatch2 = matchesName(assigned2);
            const isMatch3 = additional.some(a => matchesName(a));

            const isMatch = isMatch1 || isMatch2 || isMatch3;

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
                const completionDate = task.actualCompletionDate || task.actualEndDate;
                if (completionDate) {
                    const actualEnd = new Date(completionDate).toISOString().split('T')[0];
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
        // Auth is handled by hubstaffClient

        // Note: Hubstaff activity fetching is preserved for the 'hubstaffActivity' value in JSON response,
        // but removed from the text report as per request.
        let hubstaffActivity: HubstaffActivity = {
            timeWorked: 0,
            activityPercentage: 0,
            projects: [],
        };

        if (orgId) {
            try {
                // Get all members to find the correct user ID
                const members = await hubstaffClient.getOrganizationMembers();

                // Find user by matching Hubstaff name
                let userId: number | null = null;

                for (const member of members) {
                    const memberId = member.id;
                    const userName = member.name; // hubstaffClient returns enriched member objects with names

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

                if (userId) {
                    // Fetch activities for this user and date
                    const dailyActivities = await hubstaffClient.getDailyActivities(date, date, [userId]);

                    // Aggregate activity data
                    let totalTime = 0;
                    let totalActivityWeighted = 0;
                    const projectSet = new Set<string>();

                    console.log(`[API] Processing ${dailyActivities.length} daily_activities for ${qaName}`);

                    dailyActivities.forEach((activity: any, index: number) => {
                        const timeWorked = activity.timeWorked || 0; // Client returns 'timeWorked' (mapped from 'tracked')
                        const activityPct = activity.activityPercentage || 0;
                        // Note: client returns pre-calculated 'activityPercentage'

                        console.log(`[API] Activity ${index + 1}: tracked=${timeWorked}s, activity%=${activityPct}%, project=${activity.projectName}`);

                        totalTime += timeWorked;
                        totalActivityWeighted += activityPct * timeWorked;
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

    let text = `📋 *Work Status - ${formattedDate}*\n`;
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

            const actualDate = task.actualCompletionDate || task.actualEndDate;
            text += `✅ *Actual End Date:* ${actualDate ? formatDateDDMMYYYY(actualDate) : 'Not completed'}\n`;

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

            const actualDate = task.actualCompletionDate || task.actualEndDate;
            text += `✅ *Actual End Date:* ${actualDate ? formatDateDDMMYYYY(actualDate) : 'N/A'}\n`;

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
