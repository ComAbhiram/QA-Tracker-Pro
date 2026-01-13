const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Could not read .env.local', e);
    process.exit(1);
}

// Parse env file basic
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key && !key.startsWith('#')) {
            env[key] = value;
        }
    }
});

const refreshToken = env['HUBSTAFF_REFRESH_TOKEN'];
const orgId = env['HUBSTAFF_ORG_ID'];

console.log('Found Refresh Token:', refreshToken ? (refreshToken.substring(0, 5) + '...') : 'MISSING');
console.log('Found Org ID:', orgId || 'MISSING');

if (!refreshToken) {
    console.error('No HUBSTAFF_REFRESH_TOKEN found in .env.local');
    process.exit(1);
}

const HUBSTAFF_AUTH_BASE = 'https://account.hubstaff.com/access_tokens';
const HUBSTAFF_API_BASE = 'https://api.hubstaff.com/v2';

async function testTokenExchangeAndFetch() {
    console.log('Attempting token exchange...');

    let accessToken = '';

    try {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }).toString();

        const response = await fetch(HUBSTAFF_AUTH_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body,
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Token Exchange Failed:', response.status, text);
            return;
        }

        const data = await response.json();
        console.log('Token Exchange Success! Valid until:', data.expires_in);
        accessToken = data.access_token;

        // NOW TRY TO FETCH DATA
        console.log('Attempting to fetch Daily Activities...');

        // Use a known date or today
        const date = '2026-01-08';
        const apiUrl = `${HUBSTAFF_API_BASE}/organizations/${orgId}/activities/daily?date[start]=${date}&date[stop]=${date}`;

        console.log('Fetching URL:', apiUrl);

        const apiResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!apiResponse.ok) {
            const text = await apiResponse.text();
            console.error('API Fetch Failed:', apiResponse.status, text);
        } else {
            const apiData = await apiResponse.json();
            console.log('API Fetch Success!');
            console.log('Activities count:', apiData.daily_activities ? apiData.daily_activities.length : 0);
        }

    } catch (error) {
        console.error('Script Error:', error);
    }
}

testTokenExchangeAndFetch();
