const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.warn('Could not read .env.local');
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables after reading .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTeamMembers() {
    console.log('Checking team_members table...');

    const { data, error } = await supabase
        .from('team_members')
        .select('team_id, name');

    if (error) {
        console.error('Error fetching team_members:', error);
        return;
    }

    const counts = {};
    data.forEach(row => {
        counts[row.team_id] = (counts[row.team_id] || 0) + 1;
    });

    console.log('Team Member Counts by Team ID:', counts);
    console.log('Total rows:', data.length);

    // also check if there are any members with null team_id
    const nullTeam = data.filter(r => !r.team_id).length;
    console.log('Members with null team_id:', nullTeam);
}

checkTeamMembers();
