
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('leaves').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Leaves Keys:', data.length > 0 ? Object.keys(data[0]) : 'No data');
    }
}

check();
