
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching project names from tasks...');
    const { data, error } = await supabase
        .from('tasks')
        .select('project_name, status')
        .not('project_name', 'is', null)
        .limit(50);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found tasks:', data.length);
    const distinctProjects = new Set(data.map((t: any) => t.project_name));
    console.log('Distinct Projects:', Array.from(distinctProjects));

    // Check specifically for "Desk" or "desq"
    const desk = data.find((t: any) => t.project_name?.toLowerCase().includes('des'));
    console.log('Matches for "des":', desk ? desk.project_name : 'None');
}

main();
