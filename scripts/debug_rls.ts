
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    process.exit(1);
}

// Client for Auth (Simulate User)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('--- Debugging RLS & Data Access ---');

    const EMAIL = 'vishal@intersmart.in';
    const PASSWORD = 'Vishalhere12@';

    // 1. Login
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD,
    });

    if (loginError) {
        console.error('Login Failed:', loginError.message);
        process.exit(1);
    }

    console.log(`Logged in as: ${session?.user.email} (ID: ${session?.user.id})`);

    // 2. Try to fetch tasks
    console.log('Fetching tasks as logged-in user...');
    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, team_id, project_name')
        .limit(10);

    if (tasksError) {
        console.error('Error fetching tasks:', tasksError.message);
    } else {
        console.log(`User can see ${tasks.length} tasks.`);
        console.log('Sample tasks seen by user:', tasks);

        // Check if any belong to QA Team
        // Known QA Team ID from previous run: ba60298b-8635-4cca-bcd5-7e470fad60e6
        const qaTasks = tasks.filter(t => t.team_id === 'ba60298b-8635-4cca-bcd5-7e470fad60e6');
        if (qaTasks.length > 0) {
            console.error('CRITICAL: User can see QA Team tasks! RLS is NOT working or misconfigured.');
        } else {
            console.log('User sees NO QA Team tasks (in this sample).');
        }
    }
}

main();
