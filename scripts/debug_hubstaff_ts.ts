
import { getValidAccessToken } from '../src/lib/hubstaff-auth';
import fetch from 'node-fetch';

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';
const ORG_ID = process.env.HUBSTAFF_ORG_ID || '1789710';

async function debugHubstaff() {
    console.log('--- Starting Hubstaff Debug (TS) ---');

    // Get Token
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
        console.error('Failed to get access token');
        process.exit(1);
    }
    console.log('got access token');

    // 1. Fetch ALL Projects
    console.log('\nStep 1: Fetching Projects...');
    let allProjects: any[] = [];
    let pageId: string | null = null;

    do {
        const pageParam = pageId ? `&page_start_id=${pageId}` : '';
        const url = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/projects?status=active${pageParam}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        const data: any = await response.json();
        const projects = data.projects || [];
        allProjects = [...allProjects, ...projects];
        pageId = data.pagination?.next_page_start_id || null;
    } while (pageId);

    console.log(`Total Projects Found: ${allProjects.length}`);

    // Test Project
    const targetName = "Sample Templates / (PROJECT_NAME) - Design"; // One from your screenshot
    const project = allProjects.find((p: any) => p.name === targetName);

    if (!project) {
        console.log(`❌ Project EXACT match failed for: "${targetName}"`);
        // Fuzzy
        const partial = allProjects.find((p: any) => p.name.includes("Sample Templates"));
        if (partial) console.log(`Found similar: ${partial.name}`);
        return;
    }

    console.log(`✅ Found Project: ${project.name} (ID: ${project.id})`);

    // Fetch Activities
    console.log('\nStep 3: Fetching Activities...');
    const actsUrl = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/activities/daily?project_ids=${project.id}`;
    const actsRes = await fetch(actsUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        }
    });
    const actsData: any = await actsRes.json();
    console.log('Activity Response:', JSON.stringify(actsData, null, 2));
}

debugHubstaff().catch(console.error);
