
const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HUBSTAFF_AUTH_BASE = 'https://account.hubstaff.com/access_tokens';
const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';
const ORG_ID = process.env.HUBSTAFF_ORG_ID;

// Minimal Token Logic (DB based)
async function getAccessToken() {
    // 1. Load from DB
    const { data } = await supabase.from('hubstaff_tokens').select('*').eq('id', 1).single();
    if (!data) throw new Error('No token in DB');

    // Check expiry (buffer 5 mins)
    const expiresAt = Number(data.expires_at);
    if (expiresAt > Date.now() + 300000) {
        return data.access_token;
    }

    // Refresh
    console.log('Refreshing token...');
    const response = await fetch(HUBSTAFF_AUTH_BASE, {
        method: 'POST',
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: data.refresh_token,
        }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) throw new Error(await response.text());

    const newData = await response.json();
    const newExpiresAt = Date.now() + (newData.expires_in * 1000);

    // Save
    await supabase.from('hubstaff_tokens').update({
        access_token: newData.access_token,
        refresh_token: newData.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString()
    }).eq('id', 1);

    return newData.access_token;
}

async function main() {
    try {
        const token = await getAccessToken();
        console.log('Got Access Token');

        let allProjects = [];
        let pageStartId = undefined;
        let hasMore = true;
        let pageCount = 0;

        console.log(`Fetching Active Projects for Org: ${ORG_ID}...`);

        while (hasMore) {
            pageCount++;
            let url = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/projects?status=active`;
            if (pageStartId) {
                url += `&page_start_id=${pageStartId}`;
            }

            console.log(`Fetching Page ${pageCount}...`);
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                console.error('Failed to fetch projects:', await response.text());
                break;
            }

            const data = await response.json();
            const projects = data.projects || [];
            allProjects = [...allProjects, ...projects];

            console.log(`  - Page ${pageCount} returned ${projects.length} projects.`);

            if (data.pagination && data.pagination.next_page_start_id) {
                pageStartId = data.pagination.next_page_start_id;
            } else {
                hasMore = false;
            }
        }

        console.log(`Total Projects Found: ${allProjects.length}`);

        // Search for KIBS
        const kibs = allProjects.find(p => p.name.includes("KIBS"));
        if (kibs) {
            console.log('✅ FOUND "KIBS":', kibs.name, `(ID: ${kibs.id})`);
        } else {
            console.error('❌ "KIBS" NOT FOUND in the list.');
        }

        // Check if > 100
        if (allProjects.length > 100) {
            console.log('⚠️ Project count > 100. Pagination is required.');
        } else if (allProjects.length === 100) {
            console.log('⚠️ Project count is exactly 100. Likely hit the default limit.');
        }

    } catch (err) {
        console.error(err);
    }
}

main();
