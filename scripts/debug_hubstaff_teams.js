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

async function checkTeams() {
    try {
        const token = await getAccessToken();
        console.log('Got Token');

        // 1. Fetch Organization Teams
        const teamsUrl = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/teams`;
        console.log(`fetching: ${teamsUrl}`);
        const teamsRes = await fetch(teamsUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const teamsData = await teamsRes.json();

        console.log('\n--- Hubstaff Teams Defined ---');
        console.log(JSON.stringify(teamsData, null, 2));

        // 2. Fetch Organization Members (to see if they have team_ids)
        const membersUrl = `${HUBSTAFF_API_BASE}/organizations/${ORG_ID}/members?include=users`;
        console.log(`\nfetching: ${membersUrl}`);
        const memRes = await fetch(membersUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const memData = await memRes.json();

        console.log('\n--- First 3 Members ---');
        const members = memData.members || memData.organization_memberships || [];
        console.log(JSON.stringify(members.slice(0, 3), null, 2));

    } catch (e) {
        console.error(e);
    }
}

checkTeams();
