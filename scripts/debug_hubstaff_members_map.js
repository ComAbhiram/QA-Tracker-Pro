const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';
const ORG_ID = process.env.HUBSTAFF_ORG_ID || '1789710';
const REFRESH_TOKEN = process.env.HUBSTAFF_REFRESH_TOKEN;

async function getAccessToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', REFRESH_TOKEN);
    const response = await fetch('https://account.hubstaff.com/access_tokens', {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + Buffer.from(process.env.HUBSTAFF_CLIENT_ID + ':' + process.env.HUBSTAFF_CLIENT_SECRET).toString('base64') },
        body: params
    });
    const data = await response.json();
    return data.access_token;
}

async function checkTeamMembers() {
    try {
        const token = await getAccessToken();
        console.log('Got Token');

        // Fetch Team Members
        const url = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/team_members`;
        console.log(`fetching: ${url}`);
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        console.log('\n--- Team Members Map ---');
        console.log(`Toal records: ${data.team_members?.length || 0}`);
        console.log(JSON.stringify(data.team_members?.slice(0, 5) || [], null, 2));

    } catch (e) {
        console.error(e);
    }
}

checkTeamMembers();
