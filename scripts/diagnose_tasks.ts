
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
    console.log('Fetching tasks...');
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${tasks.length} tasks.`);

    let nullStatusCount = 0;

    tasks.forEach(task => {
        if (!task.status) {
            console.log(`WARN: Task ID ${task.id} has NULL status.`);
            nullStatusCount++;
        }

        // Simulate getEffectiveStatus logic to check for crashes
        try {
            const status = task.status || 'Unknown'; // Simulation of my fix
            const s = status.toLowerCase();
        } catch (e) {
            console.error(`CRASH: Task ID ${task.id} caused crash on toLowerCase! Status val:`, task.status);
        }
    });

    console.log(`Analysis Complete. ${nullStatusCount} tasks had null status.`);
}

main();
