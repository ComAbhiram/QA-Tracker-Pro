
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTeamMembers() {
    console.log('Checking team_members table structure and content...');

    const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .limit(10);

    if (error) {
        console.error('Error fetching team_members:', error);
        return;
    }

    console.log('Count:', data.length);
    if (data.length > 0) {
        const firstRow = data[0];
        console.log('Columns found:', Object.keys(firstRow));
        console.log('Has display_order?', 'display_order' in firstRow);
        console.log('Sample data names:', data.map(d => d.name));
        console.log('Sample display_orders:', data.map(d => d.display_order));
    } else {
        console.log('No data found in team_members table.');
    }
}

checkTeamMembers();
