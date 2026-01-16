
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
    console.log('Fetching tasks with NULL status...');
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .is('status', null);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    if (!tasks || tasks.length === 0) {
        console.log('No NULL status tasks found.');
        return;
    }

    console.log(`Found ${tasks.length} tasks with NULL status. Fixing...`);

    for (const task of tasks) {
        const { error: updateError } = await supabase
            .from('tasks')
            .update({ status: 'In Progress' }) // Default safe status
            .eq('id', task.id);

        if (updateError) {
            console.error(`Failed to update task ${task.id}:`, updateError);
        } else {
            console.log(`Fixed Task ${task.id}: set status to 'In Progress'`);
        }
    }

    console.log('Done.');
}

main();
