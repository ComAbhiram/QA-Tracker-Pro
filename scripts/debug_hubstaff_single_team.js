const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';
const REFRESH_TOKEN = process.env.HUBSTAFF_REFRESH_TOKEN;
const TEAM_ID = 154808; // Frontend Developers

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

        const url = `${HUBSTAFF_API_BASE}/teams/${TEAM_ID}/members?include=users`;
        console.log(`fetching: ${url}`);
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            console.log('Error:', res.status, await res.text());
            return;
        }

        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));

    } catch (e) {
        console.error(e);
    }
}

checkTeamMembers();
