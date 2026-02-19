
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTeamMembers() {
    console.log('Checking team_members table structure and content...');

    // Check if display_order column exists by selecting one row
    const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching team_members:', error);
        return;
    }

    console.log('Sample data:', data);

    if (data && data.length > 0) {
        const firstRow = data[0];
        console.log('Columns found:', Object.keys(firstRow));
        console.log('Has display_order?', 'display_order' in firstRow);
    } else {
        console.log('No data found in team_members table.');
    }
}

checkTeamMembers();
