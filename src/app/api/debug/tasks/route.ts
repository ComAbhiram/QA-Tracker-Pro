import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Test 1: Chained .neq()
        const { data: chainedData, error: chainedError } = await supabase
            .from('tasks')
            .select('id, status')
            .neq('status', 'Completed')
            .neq('status', 'Rejected');

        if (chainedError) return NextResponse.json({ error: chainedError });

        const chainedCounts: Record<string, number> = {};
        chainedData?.forEach((t: any) => {
            chainedCounts[t.status] = (chainedCounts[t.status] || 0) + 1;
        });

        // Test 2: Using .in() filter to see what we SHOULD get active
        // Actually we want NOT IN.
        // Supabase syntax for NOT IN is .not('status', 'in', '("Completed","Rejected")')
        const { data: notInData, error: notInError } = await supabase
            .from('tasks')
            .select('id, status')
            .not('status', 'in', '("Completed","Rejected")');

        const notInCounts: Record<string, number> = {};
        notInData?.forEach((t: any) => {
            notInCounts[t.status] = (notInCounts[t.status] || 0) + 1;
        });

        return NextResponse.json({
            chainedResult: chainedCounts,
            notInResult: notInCounts
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
