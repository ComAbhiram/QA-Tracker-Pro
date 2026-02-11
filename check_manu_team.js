const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkManu() {
    // 1. Get user by email
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) { console.error(error); return; }

    const manu = users.find(u => u.email === 'manu@intersmart.in');

    if (!manu) {
        console.log('User manu@intersmart.in NOT FOUND in auth!');
        return;
    }

    // 2. Get profile
    const { data: profile, error: pErr } = await supabase
        .from('user_profiles')
        .select(`
            full_name,
            team_id,
            teams (
                id,
                name
            )
        `)
        .eq('id', manu.id)
        .single();

    if (pErr) {
        console.error('Error fetching profile:', pErr);
        return;
    }

    console.log(`User: ${profile.full_name}`);
    console.log(`Team: ${profile.teams.name} (ID: ${profile.teams.id})`);
}

checkManu();
