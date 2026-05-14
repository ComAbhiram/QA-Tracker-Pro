
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: users, error } = await supabaseAdmin
            .from('user_profiles')
            .select('id, full_name, email')
            .order('full_name');

        if (error) throw error;

        // Also check if there are any users with 'Josin' in the name
        const { data: josinUsers } = await supabaseAdmin
            .from('user_profiles')
            .select('id, full_name')
            .ilike('full_name', '%Josin%');

        return NextResponse.json({
            count: users?.length,
            users: users,
            josin_matches: josinUsers
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
