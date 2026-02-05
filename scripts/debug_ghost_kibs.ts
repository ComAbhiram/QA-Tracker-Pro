
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
    console.log('Searching for the ghost KIBS task...');
    console.log('Criteria: Project "KIBS / KIBS Shopify", Status "In Progress" OR End Date "2026-02-02"');

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .ilike('project_name', '%KIBS%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${tasks.length} KIBS tasks in total. Filtering for match...`);

    // Manual filter to find the one matching the report
    const ghost = tasks.filter(t =>
        (t.status === 'In Progress') ||
        (t.end_date === '2026-02-02') ||
        (t.expected_end_date === '2026-02-02')
    );

    if (ghost.length === 0) {
        console.log("No matching ghost task found in KIBS tasks.");
        // print all just in case
        // tasks.forEach(logTask);
    } else {
        console.log(`Found ${ghost.length} POTENTIAL GHOST TASKS:`);
        ghost.forEach(logTask);
    }
}

function logTask(t: any) {
    console.log(`[${t.id}] 
    Project: "${t.project_name}" 
    Assigned To: "${t.assigned_to}" 
    Assigned To 2: "${t.assigned_to2}" 
    Status: "${t.status}" 
    Start: ${t.start_date} 
    End: ${t.end_date}
    Expected End: ${t.expected_end_date}
    Sub Phase: "${t.sub_phase}"
    `);
}

main();
