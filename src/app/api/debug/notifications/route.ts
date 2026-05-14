import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/debug/notifications?pc_name=Milda
// - Checks if pc_notifications table exists
// - Counts existing rows for the PC
// - Inserts a test notification and tries to read it back
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const pcName = searchParams.get('pc_name') || 'TestPC';

    const results: Record<string, any> = {};

    // 1. Check table exists by doing a simple select
    try {
        const { data, error, count } = await supabaseAdmin
            .from('pc_notifications')
            .select('*', { count: 'exact', head: true });
        results.table_exists = !error;
        results.total_rows = count;
        results.table_error = error?.message || null;
    } catch (e: any) {
        results.table_exists = false;
        results.table_error = e.message;
    }

    // 2. Count rows for this PC
    try {
        const { count, error } = await supabaseAdmin
            .from('pc_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('pc_name', pcName);
        results.pc_row_count = count;
        results.pc_count_error = error?.message || null;
    } catch (e: any) {
        results.pc_row_count = null;
        results.pc_count_error = e.message;
    }

    // 3. Try inserting a test notification
    try {
        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('pc_notifications')
            .insert({
                pc_name: pcName,
                project_name: '🧪 Debug Test Project',
                task_name: 'Test Task',
                action: 'updated',
                is_read: false,
            })
            .select()
            .single();

        results.insert_success = !insertError;
        results.insert_error = insertError?.message || null;
        results.inserted_id = inserted?.id || null;

        // Clean up test row
        if (inserted?.id) {
            await supabaseAdmin.from('pc_notifications').delete().eq('id', inserted.id);
            results.cleanup = 'test row deleted';
        }
    } catch (e: any) {
        results.insert_success = false;
        results.insert_error = e.message;
    }

    // 4. Check SUPABASE_SERVICE_ROLE_KEY exists
    results.service_role_key_set = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    return NextResponse.json(results, { status: 200 });
}
