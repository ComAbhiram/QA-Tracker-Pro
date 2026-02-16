
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
    console.log('Checking for Jishnu...');
    const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .ilike('full_name', '%Jishnu%');

    if (error) console.error(error);
    console.log('Users found matching Jishnu:', users);

    console.log('Checking all users to find similar names...');
    const { data: allUsers } = await supabase.from('user_profiles').select('full_name');
    if (allUsers) {
        console.log('Total users:', allUsers.length);
        // primitive fuzzy search
        const likely = allUsers.filter(u => u.full_name?.toLowerCase().includes('gopal') || u.full_name?.toLowerCase().includes('ishnu'));
        console.log('Likely matches:', likely);
    }
}

checkUser();
