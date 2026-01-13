// Hubstaff API Client
// Documentation: https://developer.hubstaff.com/

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

export interface HubstaffActivity {
    userId: number;
    userName: string;
    date: string;
    timeWorked: number; // in seconds
    activityPercentage: number;
    projectName?: string;
    projectId?: number;
}

export interface HubstaffDailyActivity {
    date: string;
    totalTime: number;
    activities: HubstaffActivity[];
}

/**
 * Fetch activities for a specific date
 * Note: This requires a Hubstaff Personal Access Token
 */
export async function fetchHubstaffActivities(
    date: string, // Format: YYYY-MM-DD
    accessToken: string,
    orgId: string
): Promise<HubstaffDailyActivity | null> {
    try {
        // Fetch activities for the organization
        const response = await fetch(
            `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities?date=${date}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.error('Hubstaff API error:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();

        // Transform the data to our format
        const activities: HubstaffActivity[] = [];
        let totalTime = 0;

        // Note: Actual response structure may vary - adjust based on API response
        if (data.activities) {
            data.activities.forEach((activity: any) => {
                const timeWorked = activity.tracked || 0;
                totalTime += timeWorked;

                activities.push({
                    userId: activity.user_id,
                    userName: activity.user_name || 'Unknown',
                    date: date,
                    timeWorked: timeWorked,
                    activityPercentage: activity.activity || 0,
                    projectName: activity.project_name,
                    projectId: activity.project_id,
                });
            });
        }

        return {
            date,
            totalTime,
            activities,
        };
    } catch (error) {
        console.error('Error fetching Hubstaff activities:', error);
        return null;
    }
}

/**
 * Format seconds to hours and minutes
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Get activity level color
 */
export function getActivityColor(percentage: number): string {
    if (percentage >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
}
