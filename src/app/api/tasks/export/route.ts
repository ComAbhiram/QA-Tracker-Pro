import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        let query = supabase.from('tasks').select('*');

        // QA Team Global Logic (same as in other parts of the app)
        // If it's NOT the QA Team (ID: ba60...), filter by team_id
        // If it IS the QA Team, we fetch GLOBAL tasks (no filter), OR strictly QA team tasks?
        // Use Case: "Migrate all tasks". If I am QA Team (Global Manager), I probably want to export 
        // tasks assigned to the QA Team specifically? Or everything?
        // User request: "in each team account including super admin... migrate all tasks".
        // Use strict team filtering to be safe, unless special case needed.
        // If I am "QA Team", I likely only own tasks assigned to "QA Team".
        // Let's stick to strict Filtering by Team ID for migration to avoid leaking 
        // global tasks into a specific team export unless intended.

        query = query.eq('team_id', teamId);

        const { data, error } = await query;

        if (error) {
            console.error('Export DB Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Return as JSON file download
        return new NextResponse(JSON.stringify(data, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="tasks_export_${teamId}.json"`,
            },
        });

    } catch (error: any) {
        console.error('Export Handler Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
