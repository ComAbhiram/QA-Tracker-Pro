
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
    console.log('Fetching tasks for Aswathi...');

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .or('assigned_to.ilike.%Aswathi%,assigned_to2.ilike.%Aswathi%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${tasks.length} tasks for Aswathi:`);
    tasks.forEach(t => {
        console.log(`[${t.id}] Project: "${t.project_name}" | Phase: "${t.sub_phase}" | Status: "${t.status}" | Start: ${t.start_date} | End: ${t.end_date} | Assignee: ${t.assigned_to}`);
    });
}

main();
