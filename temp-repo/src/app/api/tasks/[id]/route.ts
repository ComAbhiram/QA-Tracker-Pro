import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const taskId = parseInt(params.id, 10);
        if (isNaN(taskId)) {
            return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
        }

        const { data: task, error } = await supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error || !task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ task });
    } catch (err: any) {
        console.error('[GET /api/tasks/:id] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
