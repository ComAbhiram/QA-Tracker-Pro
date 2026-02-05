import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getValidAccessToken } from '@/lib/hubstaff-auth';
import { determineUserTeam } from '@/lib/hubstaff-team-mapping';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

// Global Caches
let projectsCache: { data: any[], timestamp: number } | null = null;
let teamMemberMappingCache: { userTeamMap: Record<number, string>, userNameMap: Record<number, string>, timestamp: number } | null = null;
let initPromise: Promise<{ projects: any[], userTeamMap: Record<number, string>, userNameMap: Record<number, string> }> | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function ensureInitialization(addLog: (m: string) => void) {
    const now = Date.now();
    if (projectsCache && teamMemberMappingCache && (now - projectsCache.timestamp < CACHE_TTL) && (now - teamMemberMappingCache.timestamp < CACHE_TTL)) {
        return { projects: projectsCache.data, userTeamMap: teamMemberMappingCache.userTeamMap, userNameMap: teamMemberMappingCache.userNameMap };
    }
    if (initPromise) {
        addLog('Waiting for ongoing global initialization...');
        return initPromise;
    }
    initPromise = (async () => {
        addLog('Starting global Hubstaff initialization (LOCK ACQUIRED)');
        const orgId = process.env.HUBSTAFF_ORG_ID;
        const accessToken = await getValidAccessToken();
        if (!orgId || !accessToken) throw new Error('Hubstaff credentials missing');

        // 1. Fetch Projects
        addLog('Fetching all projects from Hubstaff...');
        let allProjects: any[] = [];
        let pageId: string | null = null;
        do {
            const pageParam: string = pageId ? `&page_start_id=${pageId}` : '';
            const resp: Response = await fetch(`${HUBSTAFF_API_BASE}/organizations/${orgId}/projects?${pageParam}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!resp.ok) {
                addLog(`Error fetching projects: ${resp.status} ${resp.statusText}`);
                break;
            }
            const data: any = await resp.json();
            allProjects = [...allProjects, ...(data.projects || [])];
            pageId = data.pagination?.next_page_start_id || null;
        } while (pageId);
        addLog(`Successfully fetched ${allProjects.length} projects from Hubstaff.`);
        if (allProjects.length > 0) {
            addLog(`Sample Hubstaff project names: ${allProjects.slice(0, 5).map(p => p.name).join(', ')}`);
        }
        projectsCache = { data: allProjects, timestamp: Date.now() };

        // 2. Fetch Teams and Members Mapping
        const userTeamMap: Record<number, string> = {};
        const userNameMap: Record<number, string> = {};
        const teamsResp = await fetch(`${HUBSTAFF_API_BASE}/organizations/${orgId}/teams`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const teamsData = await teamsResp.json();
        const teams = teamsData.teams || [];
        const HUBSTAFF_TEAM_MAPPING: Record<string, string> = {
            'UI/UX Designers': 'Design', 'Frontend Developers': 'FE Dev', 'Backend Developers': 'BE Dev',
            'QA Developers': 'Testing', 'WordPress Developers': 'FE Dev', 'Mobile App Developers': 'FE Dev'
        };

        for (const team of teams) {
            const appTeamName = HUBSTAFF_TEAM_MAPPING[team.name];
            if (appTeamName) {
                const tmResp = await fetch(`${HUBSTAFF_API_BASE}/teams/${team.id}/members?include=users`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (tmResp.ok) {
                    const tmData = await tmResp.json();
                    (tmData.users || []).forEach((u: any) => {
                        userTeamMap[u.id] = appTeamName;
                        userNameMap[u.id] = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                    });
                }
            }
        }

        const amResp = await fetch(`${HUBSTAFF_API_BASE}/organizations/${orgId}/members?include=users`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (amResp.ok) {
            const amData = await amResp.json();
            (amData.users || []).forEach((u: any) => {
                const uid = u.id;
                if (!userNameMap[uid]) userNameMap[uid] = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                if (!userTeamMap[uid]) userTeamMap[uid] = determineUserTeam(u);
            });
        }
        teamMemberMappingCache = { userTeamMap, userNameMap, timestamp: Date.now() };
        addLog('Global initialization complete!');
        return { projects: allProjects, userTeamMap, userNameMap };
    })().finally(() => { initPromise = null; });
    return initPromise;
}

export async function GET(request: NextRequest) {
    const logs: string[] = [];
    const logFile = path.join(process.cwd(), 'hubstaff_bulk_debug.log');
    const requestId = Math.random().toString(36).substring(7);
    const addLog = (msg: string) => {
        const timestamp = new Date().toISOString();
        const fullMsg = `[${timestamp}] [${requestId}] ${msg}`;
        logs.push(fullMsg);
        try { fs.appendFileSync(logFile, fullMsg + '\n'); } catch (e) { }
    };

    try {
        const projectNamesParam = request.nextUrl.searchParams.get('project_names');
        if (!projectNamesParam) return NextResponse.json({ error: 'Missing project_names' }, { status: 400 });

        const projectNames = projectNamesParam.split(',');
        const { projects, userTeamMap, userNameMap } = await ensureInitialization(addLog);
        const orgId = process.env.HUBSTAFF_ORG_ID;
        const accessToken = await getValidAccessToken();

        // 1. Match Projects
        const matchedProjectIds: string[] = [];
        const hsIdToLocalName: Record<number, string> = {};

        projectNames.forEach(localName => {
            const normalized = localName.toLowerCase().trim();
            // Try exact match
            let found = projects.find(p => p.name.toLowerCase().trim() === normalized);

            if (!found) {
                // Try stripping common prefixes or anything before a /
                const stripPrefix = (name: string) => {
                    const parts = name.split('/');
                    return parts[parts.length - 1].toLowerCase().trim();
                };

                const localBase = stripPrefix(normalized);
                found = projects.find(p => {
                    const hsBase = stripPrefix(p.name);
                    return hsBase === localBase || hsBase.includes(localBase) || localBase.includes(hsBase);
                });
            }

            if (found) {
                matchedProjectIds.push(found.id);
                hsIdToLocalName[found.id] = localName;
            } else {
                addLog(`No match for: "${localName}"`);
                // Let's see if there's anything remotely close for the first few failures
                if (matchedProjectIds.length < 5) {
                    const close = projects.filter(p =>
                        p.name.toLowerCase().includes(localName.toLowerCase().substring(0, 5))
                    ).map(p => p.name).slice(0, 3);
                    if (close.length > 0) addLog(`  (Did you mean: ${close.join(', ')}?)`);
                }
            }
        });

        addLog(`Matched ${matchedProjectIds.length} projects out of ${projectNames.length}`);
        if (matchedProjectIds.length === 0) {
            if (projects.length > 0) {
                addLog(`First 5 projects available in Hubstaff: ${projects.slice(0, 5).map(p => p.name).join(', ')}`);
            } else {
                addLog('Hubstaff API returned 0 projects.');
            }
            return NextResponse.json({ results: {}, debug_logs: logs });
        }

        // 2. Fetch Activities in Date and Project Chunks
        // Hubstaff /activities/daily limit: 31 days range
        const allActivities: any[] = [];
        const chunksOf30Days: { start: string, stop: string }[] = [];
        let currentEnd = new Date();
        const TOTAL_HISTORY_DAYS = 365; // Reduced to 1 year to prevent Vercel 10s timeouts (was 730)
        const DAYS_PER_CHUNK = 30; // Increased to 30 as /activities/daily supports up to 31 days

        // Generate chunks ensuring we don't exceed the limit
        for (let i = 0; i < Math.ceil(TOTAL_HISTORY_DAYS / DAYS_PER_CHUNK); i++) {
            const start = new Date(currentEnd.getTime());
            start.setDate(start.getDate() - (DAYS_PER_CHUNK - 1));

            chunksOf30Days.push({
                start: start.toISOString().split('T')[0],
                stop: currentEnd.toISOString().split('T')[0]
            });

            // Move to the day before this chunk's start
            currentEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
        }
        addLog(`Generated ${chunksOf30Days.length} date chunks of ${DAYS_PER_CHUNK} days.`);

        const PROJECT_CHUNK_SIZE = 80; // Increased to 80 to reduce total requests

        // Helper for concurrency limiting
        const pLimit = (concurrency: number) => {
            const queue: (() => Promise<void>)[] = [];
            let active = 0;
            const next = (): void => {
                if (active < concurrency && queue.length) {
                    active++;
                    const fn = queue.shift()!;
                    fn().then(() => {
                        active--;
                        next();
                    });
                }
            };
            return (fn: () => Promise<void>) => {
                return new Promise<void>((resolve, reject) => {
                    const run = async () => {
                        try {
                            await fn();
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    };
                    queue.push(run);
                    next();
                });
            };
        };

        const limit = pLimit(5); // 5 concurrent requests

        // Helper: Sleep
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Helper: Fetch with Retry on 429
        const fetchWithRetry = async (url: string, options: any, retries = 3): Promise<Response> => {
            try {
                const resp = await fetch(url, options);
                if (resp.status === 429) {
                    if (retries > 0) {
                        const retryAfter = resp.headers.get('Retry-After');
                        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000; // Default 60s
                        addLog(`Rate Limit 429 Hit. Waiting ${waitTime / 1000}s before retry...`);
                        await sleep(waitTime + 1000); // Add extra 1s buffer
                        return fetchWithRetry(url, options, retries - 1);
                    }
                }
                return resp;
            } catch (err: any) {
                if (retries > 0) {
                    addLog(`Fetch error: ${err.message}. Retrying...`);
                    await sleep(2000); // 2s wait on network error
                    return fetchWithRetry(url, options, retries - 1);
                }
                throw err;
            }
        };

        const fetchTasks: Promise<void>[] = [];

        for (const dateChunk of chunksOf30Days) {
            for (let i = 0; i < matchedProjectIds.length; i += PROJECT_CHUNK_SIZE) {
                const pChunk = matchedProjectIds.slice(i, i + PROJECT_CHUNK_SIZE);

                fetchTasks.push(limit(async () => {
                    await sleep(Math.random() * 2000); // Random jitter delay 0-2s to avoid Thundering Herd

                    addLog(`Fetching: ${dateChunk.start} to ${dateChunk.stop} (Projects: ${pChunk.length})`);
                    let pageId: string | null = null;
                    do {
                        const pageParam: string = pageId ? `&page_start_id=${pageId}` : '';
                        const url: string = `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?project_ids=${pChunk.join(',')}&date[start]=${dateChunk.start}&date[stop]=${dateChunk.stop}${pageParam}`;

                        try {
                            const resp = await fetchWithRetry(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                            if (!resp.ok) {
                                const errText = await resp.text();
                                addLog(`Error fetch (${resp.status}): ${errText.substring(0, 100)}...`);
                                break;
                            }
                            const data: any = await resp.json();
                            const dActivities: any[] = data.daily_activities || [];
                            allActivities.push(...dActivities);
                            pageId = data.pagination?.next_page_start_id || null;
                        } catch (err: any) {
                            addLog(`Fetch Ex: ${err.message}`);
                        }
                    } while (pageId);
                }));
            }
        }

        await Promise.all(fetchTasks);
        addLog(`Total daily activities fetched: ${allActivities.length}`);

        // 3. Aggregate
        const results: Record<string, any> = {};
        projectNames.forEach(name => {
            results[name] = {
                project_name: name, hs_time_taken_days: 0, activity_percentage: 0,
                team_breakdown: { design_days: 0, fe_dev_days: 0, be_dev_days: 0, testing_days: 0, other_days: 0 },
                member_activities: [], total_work_days: 0
            };
        });

        const projectStats: Record<string, any> = {};
        allActivities.forEach(activity => {
            const localName = hsIdToLocalName[activity.project_id];
            if (!localName) return;
            if (!projectStats[localName]) {
                projectStats[localName] = { totalTime: 0, totalWeightedActivity: 0, teamTime: { Design: 0, 'FE Dev': 0, 'BE Dev': 0, Testing: 0, Unknown: 0 }, members: new Map() };
            }
            const s = projectStats[localName];
            const time = activity.tracked || 0;
            const hours = time / 3600;
            const actPct = time > 0 ? Math.round((activity.overall / time) * 100) : 0;
            const uid = activity.user_id;
            const team = userTeamMap[uid] || 'Unknown';
            s.totalTime += time;
            s.totalWeightedActivity += actPct * time;
            if (team in s.teamTime) {
                s.teamTime[team as keyof typeof s.teamTime] += hours;
            } else {
                s.teamTime.Unknown += hours;
            }

            if (!s.members.has(uid)) s.members.set(uid, { user_id: uid, user_name: userNameMap[uid] || `User ${uid}`, team, hours: 0, activity_percentage: 0 });
            const m = s.members.get(uid);
            m.hours += hours;
            m.activity_percentage = actPct;
        });

        Object.entries(projectStats).forEach(([name, s]) => {
            const res = results[name];
            res.hs_time_taken_days = (s.totalTime / (3600 * 8)) || 0;
            res.total_work_days = res.hs_time_taken_days;
            res.activity_percentage = s.totalTime > 0 ? Math.round(s.totalWeightedActivity / s.totalTime) : 0;
            res.team_breakdown = {
                design_days: (s.teamTime.Design / 8) || 0,
                fe_dev_days: (s.teamTime['FE Dev'] / 8) || 0,
                be_dev_days: (s.teamTime['BE Dev'] / 8) || 0,
                testing_days: (s.teamTime.Testing / 8) || 0,
                other_days: (s.teamTime.Unknown / 8) || 0
            };
            res.member_activities = Array.from(s.members.values());
        });
        return NextResponse.json({ results, debug_logs: logs });
    } catch (error: any) {
        addLog(`CRITICAL ERROR: ${error.message}`);
        return NextResponse.json({ error: error.message, debug_logs: logs }, { status: 500 });
    }
}
