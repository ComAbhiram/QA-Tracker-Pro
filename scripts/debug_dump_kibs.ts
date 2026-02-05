
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Use Service Role Key to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('Fetching tasks for KIBS (ignoring RLS)...');

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .ilike('project_name', '%KIBS%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${tasks.length} tasks matching "KIBS":`);
    tasks.forEach(t => {
        console.log(`----`);
        console.log(`Project: ${t.project_name}`);
        console.log(`Assigned To 1: "${t.assigned_to}"`);
        console.log(`Assigned To 2: "${t.assigned_to2}"`);
        console.log(`Status: ${t.status}`);
        console.log(`Start: ${t.start_date}`);
        console.log(`End: ${t.end_date}`);
        console.log(`----`);
    });
}

main();
