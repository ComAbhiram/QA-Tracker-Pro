
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: tasks, error } = await supabaseServer
            .from('tasks')
            .select('*')
            .ilike('project_name', '%KIBS%');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            count: tasks.length,
            tasks: tasks.map(t => ({
                id: t.id,
                project: t.project_name,
                assigned_to: t.assigned_to,
                assigned_to2: t.assigned_to2,
                status: t.status,
                start_date: t.start_date,
                end_date: t.end_date,
                expected_end_date: t.expected_end_date
            }))
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
