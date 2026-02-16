
const { createClient } = require('@supabase/supabase-js');

// Using the hardcoded keys from previous steps (assuming they are still valid/safe to use for debug in this context)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
    console.log('--- TEAMS ---');
    const { data: teams } = await supabase.from('teams').select('id, name');
    console.log(teams);

    console.log('\n--- PROJECTS (Search: Talent) ---');
    const { data: projects } = await supabase.from('projects').select('*').ilike('name', '%Talent%');
    console.log('In "projects" table:', projects);

    const { data: overviews } = await supabase.from('project_overview').select('*').ilike('project_name', '%Talent%');
    console.log('In "project_overview" table:', overviews);

    console.log('\n--- LEAVES (Search: Jishnu) ---');
    // First find user to get ID
    const { data: users } = await supabase.from('user_profiles').select('id, full_name, team_id, name').ilike('full_name', '%Jishnu%');
    console.log('Users found:', users);

    if (users && users.length > 0) {
        for (const u of users) {
            console.log(`Checking leaves for User: ${u.full_name} (${u.id}) Team: ${u.team_id}`);
            const { data: leaves } = await supabase.from('leaves').select('*').eq('team_member_id', u.id);
            console.log(`Leaves (Count: ${leaves.length}):`, leaves.map(l => ({ date: l.leave_date, type: l.leave_type, team_id: l.team_id })));
        }
    } else {
        // Try searching leaves by name text directly if user not found
        const { data: leavesByName } = await supabase.from('leaves').select('*').ilike('team_member_name', '%Jishnu%');
        console.log('Leaves found by name text:', leavesByName.map(l => ({ name: l.team_member_name, date: l.leave_date, team_id: l.team_id })));
    }
}

debug();
