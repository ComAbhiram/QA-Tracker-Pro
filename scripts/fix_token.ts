
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const REFRESH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImRlZmF1bHQifQ.eyJqdGkiOiJVRktzeDhWNyIsImlzcyI6Imh0dHBzOi8vYWNjb3VudC5odWJzdGFmZi5jb20iLCJleHAiOjE3NzYxNDUzMjgsImlhdCI6MTc2ODM2OTMyOCwic2NvcGUiOiJvcGVuaWQgaHVic3RhZmY6cmVhZCJ9.RoBKkMd_cKqZ4KGe74Ym2XfltQ4aEEoPoMkdPSeXxIU4Myk0L0k9syOziczo0svdFjNiQ90_Ld5FY3F70LejNIQE5z_Dw3Und72mVSJMm28egz9Cm5_0B2pMC5YHQPud4-7jY0jH_eyaGpKuHedM-5xeKC6MlItnI-VGB96FQ--AeO6xslTnLePSkiiLVW1hPpMMbv-pEZ8ynCUzJliLwJLPiQ_GMdCPUjir4M9zRtDIA_u_jb1-5y42C3QCIFGCwFygVNuGtTQjIBKy2CIaAdeRSWY-eDh263Fk4aAGGZRPXJ_r-aWofOkHRTcR2FcK9UfRlJttOso2R0mJRTOraQ';

async function main() {
    console.log('Attempting to fix Hubstaff Token...');

    // 1. Try to SELECT
    const { data: existing } = await supabase.from('hubstaff_tokens').select('*').eq('id', 1).single();

    if (existing) {
        console.log('Row exists, updating...');
        const { error } = await supabase.from('hubstaff_tokens').update({
            refresh_token: REFRESH_TOKEN,
            expires_at: 0, // Force refresh
            updated_at: new Date().toISOString()
        }).eq('id', 1);

        if (error) console.error('Update failed:', error);
        else console.log('SUCCESS: Token updated.');
    } else {
        console.log('Row missing, inserting...');
        const { error } = await supabase.from('hubstaff_tokens').insert({
            id: 1,
            access_token: '',
            refresh_token: REFRESH_TOKEN,
            expires_at: 0,
            updated_at: new Date().toISOString()
        });

        if (error) console.error('Insert failed:', error);
        else console.log('SUCCESS: Token inserted.');
    }
}

main();
