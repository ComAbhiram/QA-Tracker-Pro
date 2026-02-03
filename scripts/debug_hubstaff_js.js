const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' }); // Try .env.local first
require('dotenv').config(); // Fallback to .env

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';
const ORG_ID = process.env.HUBSTAFF_ORG_ID || '1789710';
const REFRESH_TOKEN = process.env.HUBSTAFF_REFRESH_TOKEN;

async function getAccessToken() {
    console.log('Refreshing token...');
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', REFRESH_TOKEN);

    const response = await fetch('https://account.hubstaff.com/access_tokens', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(process.env.HUBSTAFF_CLIENT_ID + ':' + process.env.HUBSTAFF_CLIENT_SECRET).toString('base64'),
        },
        body: params
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${await response.text()}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function debugHubstaff() {
    console.log('--- Starting Hubstaff Debug (JS) ---');
    console.log('Org ID:', ORG_ID);

    if (!REFRESH_TOKEN) {
        console.error('No Refresh Token found in env');
        return;
    }

    try {
        const accessToken = await getAccessToken();
        console.log('✅ Got Access Token');

        // 1. Fetch ALL Projects
        console.log('\nStep 1: Fetching Projects...');
        let allProjects = [];
        let pageId = null;

        do {
            const pageParam = pageId ? `&page_start_id=${pageId}` : '';
            const url = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/projects?status=active${pageParam}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            const projects = data.projects || [];
            allProjects = [...allProjects, ...projects];
            pageId = data.pagination?.next_page_start_id || null;
            process.stdout.write('.');
        } while (pageId);

        console.log(`\nTotal Projects Found: ${allProjects.length}`);

        // Test Project
        // Using a project I see in your screenshot
        const targetName = "1 Sample Templates / (PROJECT_NAME) - Design";

        console.log(`\nSearching for: "${targetName}"`);

        let project = allProjects.find(p => p.name === targetName);

        if (!project) {
            console.log(`❌ EXACT match failed.`);
            // Fuzzy check
            const partial = allProjects.find(p => p.name.includes("Sample Templates"));
            if (partial) {
                console.log(`Found similar: "${partial.name}" (ID: ${partial.id})`);
                project = partial;
            } else {
                console.log('No similar project found.');
                return;
            }
        }

        if (project) {
            console.log(`✅ Using Project: ${project.name} (ID: ${project.id})`);

            // Fetch Activities
            console.log('\nStep 3: Fetching Activities...');
            // IMPORTANT: By default Hubstaff returns only TODAY'S activity if no date is specified?
            // Let's try to fetch for the last 30 days to be sure we see something.
            // Or maybe the user expects "All Time"? The screenshot shows "0.00" which implies NO data found.

            // Let's try fetching without date params first (which usually means "today")
            // And then with a date range.

            const actsUrl = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/activities/daily?project_ids=${project.id}`;
            console.log(`Fetching URL: ${actsUrl}`);

            const actsRes = await fetch(actsUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });
            const actsData = await actsRes.json();
            console.log('Activity Response (Default/Today):', JSON.stringify(actsData, null, 2));

            // Try last 30 days
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = new Date().toISOString().split('T')[0];

            const rangeUrl = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/activities/daily?project_ids=${project.id}&date[start]=${startStr}&date[stop]=${endStr}`;
            console.log(`\nFetching Last 30 Days: ${rangeUrl}`);

            const rangeRes = await fetch(rangeUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });
            const rangeData = await rangeRes.json();

            const totalTracked = (rangeData.daily_activities || []).reduce((acc, curr) => acc + curr.tracked, 0);
            console.log(`Total Tracked (Seconds) in last 30 days: ${totalTracked}`);
        }

    } catch (e) {
        console.error(e);
    }
}

debugHubstaff();
