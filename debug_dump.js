
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
    console.log('--- DUMPING FIRST 5 ITEMS PER TABLE ---');

    const { data: projects } = await supabase.from('projects').select('id, name, team_id').limit(5);
    console.log('Projects:', projects);

    const { data: overviews } = await supabase.from('project_overview').select('id, project_name, team_id').limit(5);
    console.log('Overviews:', overviews);

    const { data: users } = await supabase.from('user_profiles').select('id, full_name, team_id').limit(5);
    console.log('Users:', users);

    // Try simplified search for Jishnu again
    const { data: jishnu } = await supabase.from('user_profiles').select('full_name').ilike('full_name', '%Jishnu%');
    console.log('Search Jishnu Result:', jishnu);
}

debug();
