import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/notifications?pc_name=Bindhu&is_read=false&action=created&from=2026-01-01&to=2026-02-28&search=project&page=1
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pcName = searchParams.get('pc_name');
        const isRead = searchParams.get('is_read');
        const action = searchParams.get('action');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('page_size') || '25');

        if (!pcName) {
            return NextResponse.json({ error: 'pc_name is required' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('pc_notifications')
            .select('*', { count: 'exact' })
            .eq('pc_name', pcName)
            .order('created_at', { ascending: false });

        if (isRead === 'true') query = query.eq('is_read', true);
        if (isRead === 'false') query = query.eq('is_read', false);
        if (action && action !== 'all') query = query.eq('action', action);
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to + 'T23:59:59Z');
        if (search) {
            query = query.or(`project_name.ilike.%${search}%,task_name.ilike.%${search}%`);
        }

        // Pagination
        const from_idx = (page - 1) * pageSize;
        const to_idx = from_idx + pageSize - 1;
        query = query.range(from_idx, to_idx);

        const { data, count, error } = await query;
        if (error) throw error;

        // Unread count (always fresh)
        const { count: unreadCount } = await supabaseAdmin
            .from('pc_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('pc_name', pcName)
            .eq('is_read', false);

        return NextResponse.json({
            notifications: data || [],
            total: count || 0,
            unreadCount: unreadCount || 0,
            page,
            pageSize,
        });
    } catch (error: any) {
        console.error('[Notifications API] GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
