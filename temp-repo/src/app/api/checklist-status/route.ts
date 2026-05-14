import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('project_name');

    try {
        let query = supabase
            .from('project_checklist_status')
            .select('*, checklist:checklists(id, title)');

        if (projectName) {
            query = query.eq('project_name', projectName);
        }

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json({ statuses: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { project_name, checklist_id, is_checked, checked_by } = await request.json();

        if (!project_name || !checklist_id) {
            return NextResponse.json({ error: 'project_name and checklist_id are required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('project_checklist_status')
            .upsert(
                {
                    project_name,
                    checklist_id,
                    is_checked: !!is_checked,
                    checked_by: checked_by || null,
                    checked_at: is_checked ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'project_name,checklist_id' }
            )
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ status: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
