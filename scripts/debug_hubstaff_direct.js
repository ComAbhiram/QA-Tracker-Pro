const fetch = require('node-fetch');

// API Configuration
const ORG_ID = '1789710'; // Hardcoded for debugging
// You'll need to provide your ACCESS_TOKEN
const ACCESS_TOKEN = process.env.HUBSTAFF_ACCESS_TOKEN;
const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

async function debugHubstaff() {
    if (!ACCESS_TOKEN) {
        console.error('Please set HUBSTAFF_ACCESS_TOKEN env var');
        process.exit(1);
    }

    console.log('--- Starting Hubstaff Debug ---');
    console.log(`Org ID: ${ORG_ID}`);

    // 1. Fetch ALL Projects (with pagination)
    console.log('\nStep 1: Fetching Projects...');
    let allProjects = [];
    let pageId = null;

    do {
        const pageParam = pageId ? `&page_start_id=${pageId}` : '';
        const url = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/projects?status=active${pageParam}`;
        console.log(`Fetching: ${url}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        const projects = data.projects || [];
        console.log(`  Found ${projects.length} projects on this page`);

        allProjects = [...allProjects, ...projects];
        pageId = data.pagination?.next_page_start_id || null;
    } while (pageId);

    console.log(`Total Projects Found: ${allProjects.length}`);

    // 2. List first 10 projects to verify names
    console.log('\nSample Projects:');
    allProjects.slice(0, 10).forEach(p => {
        console.log(`  - [${p.id}] ${p.name}`);
    });

    // 3. Allow user to input a project name to test
    const targetProjectName = process.argv[2];
    if (!targetProjectName) {
        console.log('\nUsage: node scripts/debug_hubstaff_direct.js "Project Name Here"');
        return;
    }

    console.log(`\nStep 2: Searching for project "${targetProjectName}"...`);
    const project = allProjects.find(p => p.name.toLowerCase() === targetProjectName.toLowerCase());

    if (!project) {
        console.error('  ❌ Project NOT found!');
        // Try partial match
        const partial = allProjects.filter(p => p.name.toLowerCase().includes(targetProjectName.toLowerCase()));
        if (partial.length > 0) {
            console.log('  Did you mean?');
            partial.forEach(p => console.log(`    - [${p.id}] ${p.name}`));
        }
        return;
    }

    console.log(`  ✅ Project Found: [${project.id}] ${project.name}`);

    // 4. Fetch Activities for this project
    console.log(`\nStep 3: Fetching Daily Activities for Project ID ${project.id}...`);

    // Test with a wide date range? Or no date range to get everything
    let allActivities = [];
    let actPageId = null;

    do {
        const pageParam = actPageId ? `&page_start_id=${actPageId}` : '';
        // Try getting past 30 days of data just to be sure we see SOMETHING
        // Or remove date params to get default
        const url = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/activities/daily?project_ids=${project.id}${pageParam}`;
        console.log(`Fetching: ${url}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (data.daily_activities) {
            console.log(`  Found ${data.daily_activities.length} activity records`);
            allActivities = [...allActivities, ...data.daily_activities];
        } else {
            console.log('  No daily_activities field in response:', JSON.stringify(data).substring(0, 200));
        }

        actPageId = data.pagination?.next_page_start_id || null;
    } while (actPageId);

    console.log(`Total Activity Records: ${allActivities.length}`);

    if (allActivities.length > 0) {
        console.log('\nSample Activity Data:');
        console.log(JSON.stringify(allActivities[0], null, 2));

        // Calculate total time
        const totalTime = allActivities.reduce((sum, act) => sum + (act.tracked || 0), 0);
        const totalHours = totalTime / 3600;
        const totalDays = totalHours / 8; // Assuming 8h day
        console.log(`\nTotal Tracked Time: ${totalTime}s = ${totalHours.toFixed(2)}h = ${totalDays.toFixed(2)} days`);
    } else {
        console.log('\n⚠️ No activity data returned! This is why it shows 0.');
    }
}

debugHubstaff().catch(console.error);
