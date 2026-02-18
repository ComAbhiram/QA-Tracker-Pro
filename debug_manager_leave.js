
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

// Fallbacks from test-supabase.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    try {
        console.log('Using URL:', supabaseUrl);
        console.log('--- DEBUGGING USERS ---');
        const { data: users, error: uErr } = await supabase.from('user_profiles').select('id, full_name, team_id');
        if (uErr) console.error('Users Error:', uErr);
        else console.table(users);

        console.log('\n--- DEBUGGING LEAVES (LAST 10) ---');
        const { data: leaves, error: lErr } = await supabase.from('leaves').select('*').order('created_at', { ascending: false }).limit(10);
        if (lErr) console.error('Leaves Error:', lErr);
        else console.table(leaves);

        console.log('\n--- DEBUGGING TEAMS ---');
        const { data: teams, error: tErr } = await supabase.from('teams').select('id, name');
        if (tErr) console.error('Teams Error:', tErr);
        else console.table(teams);
    } catch (e) {
        console.error('Script Error:', e);
    }
}

debug();
