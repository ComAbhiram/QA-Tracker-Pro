import { NextRequest, NextResponse } from 'next/server';
import { getDaysInMonth, aggregateMonthlyData } from '@/lib/hubstaff-utils';
import { mapHubstaffNameToQA } from '@/lib/hubstaff-name-mapping';
import { hubstaffClient } from '@/lib/hubstaff-client';

export const dynamic = 'force-dynamic';

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

        // Get all days in the month
        const days = getDaysInMonth(month, year);
        const startDate = days[0];
        const endDate = days[days.length - 1];

        console.log(`Fetching Hubstaff data for ${month}/${year} (${startDate} to ${endDate})`);

        const userIdNum = userId ? parseInt(userId) : undefined;
        const activities = await hubstaffClient.getDailyActivities(startDate, endDate, userIdNum ? [userIdNum] : undefined);

        console.log(`Total activities fetched: ${activities.length}`);

        // Transform to expected DailyActivity format for aggregation
        const mappedActivities = activities.map(activity => {
            const userName = activity.userName;
            const qaName = mapHubstaffNameToQA(userName);

            return {
                date: activity.date,
                userId: activity.userId,
                userName: userName,
                qaName: qaName,
                projectId: activity.projectId,
                projectName: activity.projectName,
                timeWorked: activity.timeWorked || 0,
                activityPercentage: activity.activityPercentage
            };
        });

        // Aggregate the data
        const monthlyData = aggregateMonthlyData(mappedActivities, month, year);

        return NextResponse.json(monthlyData);

    } catch (error: any) {
        console.error('Error fetching monthly Hubstaff data:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch monthly data',
                message: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
