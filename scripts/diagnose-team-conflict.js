const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try to load env vars
const envPaths = ['.env.local', '.env'];
for (const envPath of envPaths) {
    if (fs.existsSync(path.resolve(process.cwd(), envPath))) {
        dotenv.config({ path: path.resolve(process.cwd(), envPath) });
        break;
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    const targetEmail = 'saneesh@intersmart.in';
    const targetTeamName = 'Team React';

    console.log(`--- Diagnostics for ${targetEmail} ---`);

    // 1. Check Auth Users
    console.log('Checking Auth Users...');
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) console.error('Auth Error:', authError);

    console.log(`Total Auth Users fetched: ${users?.length || 0}`);
    const authUser = users?.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (authUser) {
        console.log('User found in Auth:', authUser.id);
    } else {
        console.log('User NOT found in Auth list (checked first 50 or pagination limit)');
    }

    // 2. Check User Profiles
    console.log('\nChecking User Profiles...');
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .ilike('email', targetEmail);

    if (profileError) console.error('Profile Error:', profileError);
    console.log('Matching profiles:', JSON.stringify(profiles, null, 2));

    // 3. Check Teams
    console.log('\nChecking Teams...');
    const { data: teams, error: teamError } = await supabaseAdmin
        .from('teams')
        .select('*')
        .ilike('name', targetTeamName);

    if (teamError) console.error('Team Error:', teamError);
    console.log('Matching teams:', JSON.stringify(teams, null, 2));
}

diagnose();
