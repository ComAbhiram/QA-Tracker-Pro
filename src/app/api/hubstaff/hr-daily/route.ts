import { NextRequest, NextResponse } from 'next/server';
import { TEAM_MEMBERS, DEPARTMENTS } from '@/lib/team-members-config';
import { hubstaffClient } from '@/lib/hubstaff-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    console.log('[HR_DAILY] Request received. Version: v2-Optimized');
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
        }

        // Fetch activities using optimized client
        const activities = await hubstaffClient.getDailyActivities(date, date);

        console.log(`HR Daily: Found ${activities.length} activities for date ${date}`);

        // Fetch configured QA members from DB
        const { data: dbMembers, error: dbError } = await (await import('@/lib/supabase')).supabase
            .from('qa_members')
            .select('*');

        if (dbError) {
            console.error('Error fetching QA members from DB:', dbError);
        }

        const effectiveTeamMembers = (dbMembers && dbMembers.length > 0)
            ? dbMembers.map((m: any) => ({
                name: m.name,
                hubstaffName: m.hubstaff_name,
                department: m.department || 'QA'
            }))
            : TEAM_MEMBERS; // Fallback to static if empty

        // Group activities by department
        const departmentData: Record<string, any[]> = {};
        DEPARTMENTS.forEach(dept => {
            departmentData[dept] = [];
        });

        // Process each configured team member
        effectiveTeamMembers.forEach((member: any) => {
            // Find activities for this member
            // Note: client already resolved user names
            const memberActivities = activities.filter(activity =>
                activity.userName === member.hubstaffName
            );

            if (memberActivities.length > 0) {
                // Aggregate data for this member
                const totalTime = memberActivities.reduce((sum, a) => sum + (a.timeWorked || 0), 0);

                // Approximate overall stats using activityPercentage (reverse calc if needed, or just weight it)
                // tracked * (percentage/100) = overall
                const totalOverall = memberActivities.reduce((sum, a) => sum + (a.timeWorked * (a.activityPercentage / 100)), 0);

                // Calculate active time (only include time segments where activity > 0)
                // Here we simplify: if activityPercentage > 0, we count usage.
                const activeTime = memberActivities.reduce((sum, a) => {
                    return (a.activityPercentage > 0) ? sum + a.timeWorked : sum;
                }, 0);

                let avgActivity = 0;
                if (activeTime > 0) {
                    avgActivity = Math.round((totalOverall / activeTime) * 100);
                }

                // Get project names
                const projectNames = [...new Set(memberActivities.map(a => a.projectName || 'Unknown').filter(Boolean))];

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
