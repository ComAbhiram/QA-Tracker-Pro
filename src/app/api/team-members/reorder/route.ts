import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { members } = body; // Array of { id: number, display_order: number }

        if (!members || !Array.isArray(members)) {
            return NextResponse.json({ error: 'Invalid members data' }, { status: 400 });
        }

        // Use a loop for now as Supabase doesn't have a built-in bulk update for different values per row easily without complex RPC
        // Given the team size is small (usually < 20), individual updates are okay, but we can wrap them in a Promise.all
        const updates = members.map(m =>
            supabaseAdmin
                .from('team_members')
                .update({ display_order: m.display_order })
                .eq('id', m.id)
        );

        const results = await Promise.all(updates);
        const errors = results.filter(r => r.error).map(r => r.error);

        if (errors.length > 0) {
            console.error('Errors during bulk reorder:', errors);
            return NextResponse.json({ error: 'Some updates failed', details: errors }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Reordered successfully' });
    } catch (error: any) {
        console.error('Unexpected error in /api/team-members/reorder:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
