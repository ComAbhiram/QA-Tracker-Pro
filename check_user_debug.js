
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
    console.log('Searching for users...');

    // List all users to see names
    const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .ilike('full_name', '%Josin%');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log('Found users:', users);

    // Also check all users just in case
    const { data: allUsers, error: allError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .limit(20);

    console.log('First 20 users:', allUsers);
}

checkUsers();
