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
            .from('project_checklists')
            .select('*, checklist:checklists(id, title)')
            .order('assigned_at', { ascending: true });

        if (projectName) {
            query = query.eq('project_name', projectName);
        }

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json({ assignments: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { project_name, checklist_ids } = await request.json();

        if (!project_name || !Array.isArray(checklist_ids)) {
            return NextResponse.json({ error: 'project_name and checklist_ids are required' }, { status: 400 });
        }

        // Delete all existing assignments for this project, then re-insert
        await supabase.from('project_checklists').delete().eq('project_name', project_name);

        if (checklist_ids.length > 0) {
            const inserts = checklist_ids.map((id: string) => ({
                project_name,
                checklist_id: id,
            }));
            const { error } = await supabase.from('project_checklists').insert(inserts);
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('project_name');
    const checklistId = searchParams.get('checklist_id');

    try {
        let query = supabase.from('project_checklists').delete();
        if (projectName) query = query.eq('project_name', projectName);
        if (checklistId) query = query.eq('checklist_id', checklistId);
        const { error } = await query;
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
