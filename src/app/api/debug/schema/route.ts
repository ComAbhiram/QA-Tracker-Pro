
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Cannot directly query information_schema easily via client without SQL function usually, 
        // but we can try to select * and see the data structure or error.

        // Alternatively, if we have a way to run SQL, we should.
        // Since we don't have a direct SQL runner for the user's DB, we'll try to select one row 
        // and return the keys to see what columns exist.

        const { data, error } = await supabaseAdmin
            .from('leaves')
            .select('*')
            .limit(1);

        if (error) throw error;

        // Check for check constraints on leaves table
        const { data: constraints, error: constraintError } = await supabaseAdmin
            .rpc('get_check_constraints', { table_name: 'leaves' });

        // If RPC fails (likely), try to infer by checking existing rows distinct leave_types
        const { data: distinctTypes } = await supabaseAdmin
            .from('leaves')
            .select('leave_type')
            .not('leave_type', 'is', null)
            .limit(50);

        const uniqueTypes = [...new Set(distinctTypes?.map(d => d.leave_type))];

        return NextResponse.json({
            columns_found: data && data.length > 0 ? Object.keys(data[0]) : 'No data to infer columns',
            existing_leave_types: uniqueTypes
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}
