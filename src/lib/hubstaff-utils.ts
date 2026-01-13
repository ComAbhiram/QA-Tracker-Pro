/**
 * Utility functions for Hubstaff data processing
 */

export interface DailyActivity {
    date: string;
    userId: number;
    userName: string;
    qaName: string;
    projectId?: number;
    projectName?: string;
    timeWorked: number; // in seconds
    activityPercentage: number;
}

export interface MonthlyQAData {
    qaName: string;
    hubstaffName: string;
    totalTime: number; // in seconds
    avgActivity: number;
    daysActive: number;
    projects: {
        projectName: string;
        time: number;
        activity: number;
    }[];
}

export interface MonthlyData {
    month: number;
    year: number;
    totalTime: number;
    avgActivity: number;
    totalDays: number;
    qaBreakdown: MonthlyQAData[];
    dailyData: {
        date: string;
        totalTime: number;
        avgActivity: number;
    }[];
}

/**
 * Get all days in a month as ISO date strings
 * @param month - Month number (1-12)
 * @param year - Year (e.g., 2026)
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getDaysInMonth(month: number, year: number): string[] {
    const days: string[] = [];
    const date = new Date(year, month - 1, 1);

    while (date.getMonth() === month - 1) {
        days.push(date.toISOString().split('T')[0]);
        date.setDate(date.getDate() + 1);
    }

    return days;
}

/**
 * Aggregate daily activities into monthly summary
 * @param dailyActivities - Array of daily activity records
 * @param month - Month number
 * @param year - Year
 * @returns Aggregated monthly data
 */
export function aggregateMonthlyData(
    dailyActivities: DailyActivity[],
    month: number,
    year: number
): MonthlyData {
    // Group activities by QA name
    const qaMap = new Map<string, {
        hubstaffName: string;
        totalTime: number;
        totalActivity: number;
        activityCount: number;
        daysActive: Set<string>;
        projects: Map<string, { time: number; activity: number; count: number }>;
    }>();

    // Group activities by date for daily breakdown
    const dailyMap = new Map<string, { totalTime: number; totalActivity: number; count: number }>();

    dailyActivities.forEach(activity => {
        // QA breakdown
        if (!qaMap.has(activity.qaName)) {
            qaMap.set(activity.qaName, {
                hubstaffName: activity.userName,
                totalTime: 0,
                totalActivity: 0,
                activityCount: 0,
                daysActive: new Set(),
                projects: new Map(),
            });
        }

        const qaData = qaMap.get(activity.qaName)!;
        qaData.totalTime += activity.timeWorked;
        qaData.totalActivity += activity.activityPercentage * activity.timeWorked;
        qaData.activityCount += activity.timeWorked;
        qaData.daysActive.add(activity.date);

        // Project breakdown for this QA
        if (activity.projectName) {
            if (!qaData.projects.has(activity.projectName)) {
                qaData.projects.set(activity.projectName, { time: 0, activity: 0, count: 0 });
            }
            const projectData = qaData.projects.get(activity.projectName)!;
            projectData.time += activity.timeWorked;
            projectData.activity += activity.activityPercentage * activity.timeWorked;
            projectData.count += activity.timeWorked;
        }

        // Daily breakdown
        if (!dailyMap.has(activity.date)) {
            dailyMap.set(activity.date, { totalTime: 0, totalActivity: 0, count: 0 });
        }
        const dailyData = dailyMap.get(activity.date)!;
        dailyData.totalTime += activity.timeWorked;
        dailyData.totalActivity += activity.activityPercentage * activity.timeWorked;
        dailyData.count += activity.timeWorked;
    });

    // Convert QA map to array
    const qaBreakdown: MonthlyQAData[] = Array.from(qaMap.entries()).map(([qaName, data]) => ({
        qaName,
        hubstaffName: data.hubstaffName,
        totalTime: data.totalTime,
        avgActivity: data.activityCount > 0 ? Math.round(data.totalActivity / data.activityCount) : 0,
        daysActive: data.daysActive.size,
        projects: Array.from(data.projects.entries())
            .map(([projectName, pData]) => ({
                projectName,
                time: pData.time,
                activity: pData.count > 0 ? Math.round(pData.activity / pData.count) : 0,
            }))
            .sort((a, b) => b.time - a.time), // Sort by time descending
    })).sort((a, b) => b.totalTime - a.totalTime); // Sort by total time descending

    // Convert daily map to array
    const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
            date,
            totalTime: data.totalTime,
            avgActivity: data.count > 0 ? Math.round(data.totalActivity / data.count) : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

    // Calculate overall totals
    const totalTime = qaBreakdown.reduce((sum, qa) => sum + qa.totalTime, 0);
    const totalActivityWeighted = dailyActivities.reduce(
        (sum, a) => sum + (a.activityPercentage * a.timeWorked),
        0
    );
    const avgActivity = totalTime > 0 ? Math.round(totalActivityWeighted / totalTime) : 0;

    return {
        month,
        year,
        totalTime,
        avgActivity,
        totalDays: dailyData.length,
        qaBreakdown,
        dailyData,
    };
}

/**
 * Format time in seconds to readable format (e.g., "5h 30m")
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) {
        return `${minutes}m`;
    }

    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Format date to DD/MM/YYYY format
 * @param date - Date string (YYYY-MM-DD) or Date object
 * @returns Formatted date string
 */
export function formatDateDDMMYYYY(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Get month name from month number
 * @param month - Month number (1-12)
 * @returns Month name (e.g., "January")
 */
export function getMonthName(month: number): string {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
}
