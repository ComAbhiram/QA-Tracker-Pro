const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPHPTeams() {
    const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name')
        .ilike('name', '%php%'); // Search for any team with "php" in name

    if (error) {
        console.error('Error fetching teams:', error);
        return;
    }

    console.log('PHP Teams Found:');
    if (teams.length === 0) {
        console.log('No teams with "php" found? Checking all teams anyway...');
        const { data: allTeams } = await supabase.from('teams').select('id, name');
        allTeams.forEach(t => console.log(`${t.id} : ${t.name}`));
    } else {
        teams.forEach(t => console.log(`${t.id} : ${t.name}`));
    }

    // Checking if the specific ID exists
    const manuTeamId = '97a4a945-dd8f-483e-8504-2c5f6026907a';
    const { data: manuTeam, error: manuErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', manuTeamId)
        .single();

    if (manuErr) {
        console.log(`\nTeam ID ${manuTeamId} NOT FOUND? Error:`, manuErr.message);
    } else {
        console.log(`\nTeam ID ${manuTeamId} FOUND OK. Name: ${manuTeam.name}`);
    }
}

checkPHPTeams();
