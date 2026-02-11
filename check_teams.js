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

async function checkTeams() {
    const { data: teams, error } = await supabase.from('teams').select('id, name');
    if (error) {
        console.error('Error fetching teams:', error);
        return;
    }
    console.log('Existing Teams:');
    teams.forEach(t => console.log(`${t.id} : ${t.name}`));
}

checkTeams();
