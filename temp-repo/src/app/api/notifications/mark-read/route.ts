import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// POST /api/notifications/mark-read
// Body: { pc_name: string, id?: string }  — if no id, marks ALL as read for pc_name
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { pc_name, id } = body;

        if (!pc_name) {
            return NextResponse.json({ error: 'pc_name is required' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('pc_notifications')
            .update({ is_read: true })
            .eq('pc_name', pc_name);

        if (id) {
            query = query.eq('id', id);
        }

        const { error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Notifications Mark-Read API] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
