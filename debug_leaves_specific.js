
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- FETCHING RELEVANT LEAVES ---');
    // Using names from screenshots
    const { data: leaves, error } = await supabase
        .from('leaves')
        .select('id, team_member_name, leave_date, leave_type, team_id')
        .or('team_member_name.ilike.%Abhiram%,team_member_name.ilike.%Aswathi%');

    if (error) console.error(error);
    else console.table(leaves);

    console.log('\n--- FETCHING TEAMS ---');
    const { data: teams } = await supabase.from('teams').select('id, name');
    console.table(teams);
}

debug();
