
const { createClient } = require('@supabase/supabase-js');

// Manually load env vars for script execution if dotenv is not available/working in this context
// Replacing these with the actual values passed in the environment would be better, but for a script 
// running in this environment, we might need to rely on the process.env if set, or just use values if known.
// Since I don't have the keys explicitly here, I'll rely on process.env and hope the runner has them.
// If this fails, I will ask the user for keys or try to read .env.local

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    console.log('Current env:', process.env);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
    console.log('Fetching users...');

    const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(`- "${u.full_name}" (ID: ${u.id})`));
}

listUsers();
