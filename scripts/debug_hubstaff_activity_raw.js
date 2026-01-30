
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

// Minimal Token Logic
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

        // 1. Find User
        console.log('Fetching Members...');
        const membersRes = await fetch(`${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/members`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const membersData = await membersRes.json();
        const members = membersData.members || [];

        let targetUserId = null;
        console.log(`Scanning ${members.length} members...`);

        for (const member of members) {
            const mId = member.user_id || member.id;
            // console.log(`Checking Member ID: ${mId}...`);
            const uRes = await fetch(`${HUBSTAFF_API_BASE}/users/${mId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (uRes.ok) {
                const uData = await uRes.json();
                const uName = uData.user.name;
                // console.log(` - Found User: ${uName}`);

                if (uName === 'Aswathi M Ashok') {
                    console.log(`MATCH FOUND: ${uName} (ID: ${mId})`);
                    targetUserId = mId;
                    break;
                }
            }
        }

        if (!targetUserId) {
            console.error('User "Aswathi M Ashok" not found after scanning members!');
            return;
        }
        const userId = targetUserId;
        console.log(`Found User: Aswathi M Ashok (ID: ${userId})`);

        // 2. Fetch Activities for 2026-01-27
        const date = '2026-01-27';
        console.log(`Fetching Activities for ${date}...`);

        const url = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/activities/daily?date[start]=${date}&date[stop]=${date}&user_ids=${userId}`;
        const activityRes = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!activityRes.ok) {
            console.error('Failed to fetch activity:', await activityRes.text());
            return;
        }

        const activityData = await activityRes.json();
        const activities = activityData.daily_activities || [];

        console.log(`Found ${activities.length} activity entries.`);

        let totalSeconds = 0;
        activities.forEach((act, i) => {
            console.log(`Entry ${i + 1}: Project ID ${act.project_id} - Tracked: ${act.tracked}s (${(act.tracked / 60).toFixed(1)}m) - Date: ${act.date}`);
            totalSeconds += act.tracked;
        });

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        console.log(`TOTAL TIME: ${totalSeconds}s = ${hours}h ${minutes}m`);
    } catch (err) {
        console.error(err);
    }
}

main();
