
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schema for table "tasks"...');

    // We can't query information_schema directly easily with supabase-js unless we use rpc.
    // But we can try to insert a row with a UUID id and see if it fails with type error (if it's int).
    // Or insert without ID (which we know fails).

    // Actually, we can just try to SELECT one row and look at the ID format.
    const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);

    if (error) {
        console.error('Error selecting from tasks:', error);
    } else {
        console.log('Sample row:', data);
        if (data && data.length > 0) {
            console.log('ID type seems to be:', typeof data[0].id);
            console.log('ID value sample:', data[0].id);
        } else {
            console.log('No rows in tasks table. Cannot infer type from data.');
        }
    }
}

checkSchema();
