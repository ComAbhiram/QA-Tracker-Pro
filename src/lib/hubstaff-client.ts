import { getValidAccessToken } from './hubstaff-auth';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// In-memory cache
const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds
const usersCache = new Map<number, CacheEntry<any>>(); // OrgId -> Users List
const projectsCache = new Map<number, CacheEntry<any>>(); // OrgId -> Projects List
// User Map Cache for quick lookups (derived from usersCache)
const userLookupCache = new Map<number, CacheEntry<Map<number, any>>>();
const projectLookupCache = new Map<number, CacheEntry<Map<number, string>>>();

export class HubstaffClient {
    private accessToken: string | null = null;
    private orgId: string | undefined;

    constructor() {
        this.orgId = process.env.HUBSTAFF_ORG_ID;
    }

    private async ensureToken() {
        if (!this.accessToken) {
            this.accessToken = await getValidAccessToken();
        }
        if (!this.accessToken) {
            throw new Error('Failed to get valid Hubstaff access token');
        }
        if (!this.orgId) {
            throw new Error('HUBSTAFF_ORG_ID is not configured');
        }
    }

    private async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
        await this.ensureToken();

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 429) {
                if (retries > 0) {
                    const retryAfter = response.headers.get('Retry-After');
                    const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * (4 - retries); // Exponential backoff fallback
                    console.warn(`Hubstaff rate limit hit. Waiting ${waitTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    return this.fetchWithRetry(url, options, retries - 1);
                }
            }

            return response;
        } catch (error) {
            if (retries > 0) {
                console.error('Fetch error, retrying...', error);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.fetchWithRetry(url, options, retries - 1);
            }
            throw error;
        }
    }

    /**
     * Get all members of the organization with full user details.
     * Uses 1-hour in-memory cache.
     */
    async getOrganizationMembers() {
        await this.ensureToken();
        const orgIdNum = parseInt(this.orgId!);

        // Check cache
        const cached = usersCache.get(orgIdNum);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('Returning cached members');
            return cached.data;
        }

        console.log('Fetching members from Hubstaff API...');
        const response = await this.fetchWithRetry(
            `${HUBSTAFF_API_BASE}/organizations/${this.orgId}/members?include=users`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch members: ${response.statusText}`);
        }

        const data = await response.json();
        const members = data.members || [];
        const users = data.users || []; // Included users

        // Create a map for easy lookup
        const userMap = new Map();
        users.forEach((u: any) => userMap.set(u.id, u));

        // Format members nicely
        const formattedMembers = members.map((m: any) => {
            const userId = m.user_id || m.id;
            const fullUser = userMap.get(userId);
            return {
                id: userId,
                name: (fullUser ? fullUser.name : m.name) || 'Unknown',
                email: fullUser ? fullUser.email : null,
                status: m.status
            };
        });

        // Update caches
        const now = Date.now();
        usersCache.set(orgIdNum, { data: formattedMembers, timestamp: now });
        userLookupCache.set(orgIdNum, { data: userMap, timestamp: now });

        return formattedMembers;
    }

    /**
     * Get all active projects for the organization.
     * Uses 1-hour in-memory cache.
     */
    async getOrganizationProjects(forceRefresh = false) {
        await this.ensureToken();
        const orgIdNum = parseInt(this.orgId!);

        // Check cache unless forceRefresh is true
        if (!forceRefresh) {
            const cached = projectsCache.get(orgIdNum);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                console.log('Returning cached projects');
                return cached.data;
            }
        } else {
            console.log('Force refresh requested, bypassing cache for projects.');
        }

        console.log(`[Hubstaff] Fetching projects for organization ${this.orgId}...`);
        let allProjects: any[] = [];
        let hasMore = true;
        let pageStartId = undefined;
        let pageCount = 0;

        while (hasMore) {
            pageCount++;
            // Fetch all projects (including archived) to see if that's why they are missing
            let url = `${HUBSTAFF_API_BASE}/organizations/${this.orgId}/projects?status=all&page_limit=500`;
            if (pageStartId) url += `&page_start_id=${pageStartId}`;

            console.log(`[Hubstaff] Fetching page ${pageCount}, url: ${url}`);
            const response = await this.fetchWithRetry(url);
            if (!response.ok) throw new Error(`Failed to fetch projects: ${response.statusText}`);

            const data = await response.json();
            const pageProjects = data.projects || [];
            allProjects = [...allProjects, ...pageProjects];

            console.log(`[Hubstaff] Page ${pageCount} returned ${pageProjects.length} projects. Total so far: ${allProjects.length}`);

            // Log a few project statuses for debugging
            if (pageProjects.length > 0) {
                console.log(`[Hubstaff] Sample project status: ${pageProjects[0].name} -> ${pageProjects[0].status}`);
            }

            if (data.pagination?.next_page_start_id) {
                pageStartId = data.pagination.next_page_start_id;
            } else {
                hasMore = false;
            }
        }

        console.log(`[Hubstaff] Finished fetching all projects. Total: ${allProjects.length}`);

        // Create lookup map
        const projectMap = new Map<number, string>();
        allProjects.forEach(p => projectMap.set(p.id, p.name));

        // Update caches
        const now = Date.now();
        projectsCache.set(orgIdNum, { data: allProjects, timestamp: now });
        projectLookupCache.set(orgIdNum, { data: projectMap, timestamp: now });

        return allProjects;
    }

    /**
     * Fetch daily activities for a specific date or date range.
     * Optimized to use page_limit=500 and cached user/project names.
     */
    async getDailyActivities(startDate: string, endDate: string, userIds?: number[]) {
        await this.ensureToken();

        // Ensure caches are populated
        await this.getOrganizationMembers();
        await this.getOrganizationProjects();

        const orgIdNum = parseInt(this.orgId!);
        const userMap = userLookupCache.get(orgIdNum)?.data;
        const projectMap = projectLookupCache.get(orgIdNum)?.data;

        console.log(`Fetching daily activities from ${startDate} to ${endDate}${userIds ? ` for users ${userIds.join(',')}` : ''}...`);

        let allActivities: any[] = [];
        let hasMore = true;
        let pageStartId = undefined;

        while (hasMore) {
            let url = `${HUBSTAFF_API_BASE}/organizations/${this.orgId}/activities/daily?date[start]=${startDate}&date[stop]=${endDate}&page_limit=500`;
            if (userIds && userIds.length > 0) {
                url += `&user_ids=${userIds.join(',')}`;
            }
            if (pageStartId) url += `&page_start_id=${pageStartId}`;

            const response = await this.fetchWithRetry(url);
            if (!response.ok) throw new Error(`Failed to fetch activities: ${response.statusText}`);

            const data = await response.json();
            allActivities = [...allActivities, ...(data.daily_activities || [])];

            if (data.pagination?.next_page_start_id) {
                pageStartId = data.pagination.next_page_start_id;
            } else {
                hasMore = false;
            }
        }

        // Enrich activities with cached names and team info
        return allActivities.map(activity => {
            const user = userMap?.get(activity.user_id);
            const projectName = activity.project_id ? projectMap?.get(activity.project_id) : undefined;

            // Map team/department from team-members-config
            const userName = (user ? user.name : null) || 'Unknown User';
            let teamName = undefined;

            // Try to match with team config to get department
            try {
                const { getTeamMemberByHubstaffName } = require('./team-members-config');
                const teamMember = getTeamMemberByHubstaffName(userName);
                if (teamMember) {
                    // Map department to display names
                    const deptMap: Record<string, string> = {
                        'DESIGNERS': 'Designers',
                        'QA': 'QA Developers',
                        'PHP': 'PHP Developers',
                        'HTML': 'Frontend Developers',
                        'APP': 'App Developers',
                        'WPD': 'WordPress Developers'
                    };
                    teamName = deptMap[teamMember.department] || teamMember.department;
                }
            } catch (e) {
                // Fallback if config not found
                console.warn('Could not load team config for team mapping');
            }

            return {
                userId: activity.user_id,
                userName,
                date: activity.date,
                timeWorked: activity.tracked,
                activityPercentage: activity.tracked > 0 ? Math.round((activity.overall / activity.tracked) * 100) : 0,
                projectId: activity.project_id,
                projectName: projectName || 'Unknown Project',
                team: teamName
            };
        });
    }
}

export const hubstaffClient = new HubstaffClient();
