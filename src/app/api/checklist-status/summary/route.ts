import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        // Get all projects that have checklists assigned
        const { data: assignments, error: assignError } = await supabase
            .from('project_checklists')
            .select('project_name, checklist_id, checklist:checklists(id, title)')
            .order('project_name');

        if (assignError) throw assignError;

        // Get all status records
        const { data: statusData, error: statusError } = await supabase
            .from('project_checklist_status')
            .select('project_name, checklist_id, is_checked');

        if (statusError) throw statusError;

        // Build a map: project_name -> { assigned: [{id, title}], statuses: {checklist_id: is_checked} }
        const projectMap: Record<string, {
            assignedChecklists: { id: string; title: string }[];
            statusMap: Record<string, boolean>;
        }> = {};

        for (const row of (assignments || [])) {
            const projName = row.project_name;
            if (!projectMap[projName]) {
                projectMap[projName] = { assignedChecklists: [], statusMap: {} };
            }
            if (row.checklist) {
                projectMap[projName].assignedChecklists.push({
                    id: (row.checklist as any).id,
                    title: (row.checklist as any).title,
                });
            }
        }

        for (const s of (statusData || [])) {
            if (projectMap[s.project_name]) {
                projectMap[s.project_name].statusMap[s.checklist_id] = s.is_checked;
            }
        }

        // Build summary rows
        const summary = Object.entries(projectMap).map(([projectName, info]) => {
            const assigned = info.assignedChecklists;
            const passed = assigned.filter(c => info.statusMap[c.id] === true);
            const pending = assigned.filter(c => !info.statusMap[c.id]);

            return {
                projectName,
                assignedChecklists: assigned,
                passedCount: passed.length,
                pendingCount: pending.length,
                passed,
                pending,
            };
        });

        return NextResponse.json({ summary });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
