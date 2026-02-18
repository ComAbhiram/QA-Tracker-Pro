const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    console.log('--- Project Coordinator Diagnosis ---');

    const { data: pcs, error } = await supabase
        .from('global_pcs')
        .select('*');

    if (error) {
        console.error('Error fetching PCs:', error);
    } else {
        console.log('Current Project Coordinators in Database:');
        console.table(pcs);
    }

    console.log('\n--- Brevo Connectivity Check ---');
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
        console.error('ERROR: BREVO_API_KEY is not set in .env.local');
    } else {
        console.log('BREVO_API_KEY is set (length: ' + brevoApiKey.length + ')');

        // Test Brevo API (Account info)
        try {
            const response = await fetch('https://api.brevo.com/v3/account', {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'api-key': brevoApiKey
                }
            });

            const data = await response.json();
            if (response.ok) {
                console.log('Brevo API Check: SUCCESS');
                console.log('Brevo Account Email:', data.email);
            } else {
                console.error('Brevo API Check: FAILED', data);
            }
        } catch (e) {
            console.error('Brevo API Check: FETCH ERROR', e.message);
        }
    }

    if (!process.env.BREVO_SENDER_EMAIL) {
        console.log('BREVO_SENDER_EMAIL not set, defaulting to: notifications@intersmart.in');
    } else {
        console.log(`BREVO_SENDER_EMAIL: ${process.env.BREVO_SENDER_EMAIL}`);
    }
}

diagnose();
