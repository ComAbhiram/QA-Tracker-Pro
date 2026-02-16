
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
    console.log('--- DEBUG USER PROFILE ---');
    const { data: users, error } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('full_name', '%Jishnu%');

    if (error) console.error(error);
    console.log('Users found:', users);

    if (users && users.length > 0) {
        const u = users[0];
        console.log(`Checking leaves for User ID: ${u.id} (Team: ${u.team_id})`);

        const { data: leaves } = await supabase
            .from('leaves')
            .select('*')
            .eq('team_member_id', u.id);

        console.log(`Leaves found (Count: ${leaves.length}):`, leaves);

        // Simulate the inner join query
        console.log('\n--- SIMULATE API QUERY ---');
        // Let's guess the Team ID they are looking at. 
        // If user is in team X, api/leaves?team_id=X should work.

        const { data: apiLeaves, error: apiError } = await supabase
            .from('leaves')
            .select('*, team_member:user_profiles!inner(team_id)')
            .eq('team_member.team_id', u.team_id);

        console.log(`API Query Result (Count: ${apiLeaves ? apiLeaves.length : 0})`);
        if (apiError) console.error('API Error:', apiError);
    }
}

debug();
