
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
    console.log('Fetching tasks for India Zone and Concord...');

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .or('project_name.ilike.%India Zone%,project_name.ilike.%Concord%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${tasks.length} tasks:`);
    tasks.forEach(t => {
        console.log(`- Project: ${t.project_name}, Assigned: "${t.assigned_to}", Status: ${t.status}, Start: ${t.start_date}, End: ${t.end_date}`);
    });
}

main();
