import { NextRequest, NextResponse } from 'next/server';
import { hubstaffClient } from '@/lib/hubstaff-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userIdFilter = searchParams.get('userId'); // Optional: filter by specific user
    const projectIdFilter = searchParams.get('projectId'); // Optional: filter by project
    const teamFilter = searchParams.get('team'); // Optional: filter by team

    // Validate parameters: Either 'date' OR 'startDate' + 'endDate' is required
    if (!date && (!startDate || !endDate)) {
        return NextResponse.json({ error: 'Either date or startDate/endDate parameters are required' }, { status: 400 });
    }

    // Determine effective start and end dates
    const effectiveStartDate = startDate || date!;
    const effectiveEndDate = endDate || date!;

    try {
        console.log(`[API] Fetching activities for range: ${effectiveStartDate} to ${effectiveEndDate}`);

        // Fetch optimized activities from client
        // The client handles caching of users/projects and pagination automatically
        const userIdNum = userIdFilter ? parseInt(userIdFilter) : undefined;
        const activities = await hubstaffClient.getDailyActivities(effectiveStartDate, effectiveEndDate, userIdNum ? [userIdNum] : undefined);

        // Filter by user if requested (client handles this but good to be safe/consistent)
        let filteredActivities = activities;
        if (userIdFilter) {
            const userIdNum = parseInt(userIdFilter);
            filteredActivities = activities.filter(a => a.userId === userIdNum);
        }

        // Filter by project if requested
        if (projectIdFilter) {
            const projectIdNum = parseInt(projectIdFilter);
            filteredActivities = filteredActivities.filter(a => a.projectId === projectIdNum);
        }

        // Filter by team if requested
        if (teamFilter) {
            filteredActivities = filteredActivities.filter(a => a.team === teamFilter);
        }

        // Calculate total time
        const totalTime = filteredActivities.reduce((sum, a) => sum + a.timeWorked, 0);

        console.log(`[API] Returned ${filteredActivities.length} activities, total time: ${totalTime}s`);

        return NextResponse.json({
            date: date || `${effectiveStartDate} to ${effectiveEndDate}`,
            startDate: effectiveStartDate,
            endDate: effectiveEndDate,
            totalTime,
            activities: filteredActivities,
        });
    } catch (error: any) {
        console.error('Error fetching Hubstaff activities:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
