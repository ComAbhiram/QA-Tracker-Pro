const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    console.log('Checking global_pcs table...');
    const { data: pcs, error } = await supabase
        .from('global_pcs')
        .select('*');

    if (error) {
        console.error('Error fetching global_pcs:', error);
    } else {
        console.log('PCs found:', pcs);
    }

    console.log('\nChecking environment variables...');
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '******** (Set)' : 'NOT SET');
}

diagnose();
