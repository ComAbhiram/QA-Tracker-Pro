
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
    console.log('Fetching all tasks...');

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('project_name, assigned_to')
        .limit(100);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${tasks.length} tasks. Project names:`);
    const projects = new Set(tasks.map(t => t.project_name));
    projects.forEach(p => console.log(`- ${p}`));
}

main();
