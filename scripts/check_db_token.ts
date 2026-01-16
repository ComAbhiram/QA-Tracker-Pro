
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Checking hubstaff_tokens table...');
    const { data, error } = await supabase
        .from('hubstaff_tokens')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) {
        console.error('Error fetching token:', error);
    } else {
        console.log('Token Data:', data);
        if (data.access_token && data.access_token.length > 10) {
            console.log('SUCCESS: Table contains an access token!');
        } else {
            console.log('WARNING: Table token is empty/null.');
        }
    }
}

main();
