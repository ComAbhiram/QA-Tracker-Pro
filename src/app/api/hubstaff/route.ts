import { NextRequest, NextResponse } from 'next/server';
import { hubstaffClient } from '@/lib/hubstaff-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const userIdFilter = searchParams.get('userId'); // Optional: filter by specific user

    if (!date) {
        return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    try {
        console.log(`[API] Fetching activities for date: ${date}`);

        // Fetch optimized activities from client
        // The client handles caching of users/projects and pagination automatically
        const userIdNum = userIdFilter ? parseInt(userIdFilter) : undefined;
        const activities = await hubstaffClient.getDailyActivities(date, date, userIdNum ? [userIdNum] : undefined);

        // Filter by user if requested (client handles this but good to be safe/consistent)
        let filteredActivities = activities;
        if (userIdFilter) {
            const userIdNum = parseInt(userIdFilter);
            filteredActivities = activities.filter(a => a.userId === userIdNum);
        }

        // Calculate total time
        const totalTime = filteredActivities.reduce((sum, a) => sum + a.timeWorked, 0);

        console.log(`[API] Returned ${filteredActivities.length} activities, total time: ${totalTime}s`);

        return NextResponse.json({
            date,
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
